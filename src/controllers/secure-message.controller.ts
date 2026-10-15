import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import ApiError from '../utils/ApiError';
import Message from '../models/message.model';
import Block from '../models/block.model';
import User from '../models/user.model';
import {
  detectExternalLinks,
  detectPhoneNumbers,
  detectEmails,
} from '../utils/security';

/**
 * Créer un nouveau message
 * Avec détection de contenu suspect (liens, numéros, emails)
 */
export const createMessage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
): Promise<void> => {
  try {
    const { echangeId, contenu } = req.body;
    const expediteur = req.user?.userId;

    if (!echangeId || !contenu) {
      throw new ApiError(400, 'EchangeId et contenu requis');
    }

    // Vérifier que l'utilisateur n'est pas banni
    const user = await User.findById(expediteur);
    if (user?.isBanned) {
      throw new ApiError(403, 'Votre compte a été suspendu');
    }

    // Sécurité: analyser le contenu
    const securityAnalysis = analyzeMessageSecurity(contenu);

    // Créer le message
    const message = new Message({
      echangeId,
      expediteur,
      contenu,
    });

    await message.save();

    // Répondre avec l'analyse de sécurité
    res.status(201).json({
      success: true,
      message: 'Message envoyé avec succès',
      data: {
        ...message.toJSON(),
        securityWarnings: securityAnalysis,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer les messages d'une conversation (échange)
 */
export const getMessages = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
): Promise<void> => {
  try {
    const { echangeId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user?.userId;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skipNum = (pageNum - 1) * limitNum;

    const messages = await Message.find({ echangeId })
      .populate('expediteur', 'firstName lastName')
      .sort('createdAt')
      .skip(skipNum)
      .limit(limitNum);

    // Analyser chaque message pour les avertissements de sécurité
    const messagesWithWarnings = messages.map((msg) => ({
      ...msg.toJSON(),
      securityWarnings: analyzeMessageSecurity(msg.contenu),
    }));

    const total = await Message.countDocuments({ echangeId });

    res.status(200).json({
      success: true,
      data: messagesWithWarnings,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Supprimer un message
 */
export const deleteMessage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
): Promise<void> => {
  try {
    const { messageId } = req.params;
    const userId = req.user?.userId;

    const message = await Message.findById(messageId);
    if (!message) {
      throw new ApiError(404, 'Message introuvable');
    }

    // Vérifier que c'est l'expéditeur ou un admin
    if (message.expediteur.toString() !== userId) {
      throw new ApiError(403, 'Vous ne pouvez pas supprimer ce message');
    }

    await Message.findByIdAndDelete(messageId);

    res.status(200).json({
      success: true,
      message: 'Message supprimé avec succès',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bloquer un utilisateur (empêcher les messages)
 */
export const blockUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
): Promise<void> => {
  try {
    const { targetUserId } = req.params;
    const blockerId = req.user?.userId;
    const { reason } = req.body;

    if (blockerId === targetUserId) {
      throw new ApiError(400, 'Vous ne pouvez pas vous bloquer vous-même');
    }

    // Vérifier que l'utilisateur existe
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      throw new ApiError(404, 'Utilisateur introuvable');
    }

    // Vérifier si déjà bloqué
    const existingBlock = await Block.findOne({
      blocker: blockerId,
      blocked: targetUserId,
    });

    if (existingBlock) {
      throw new ApiError(400, 'Cet utilisateur est déjà bloqué');
    }

    // Créer le blocage
    const block = new Block({
      blocker: blockerId,
      blocked: targetUserId,
      reason,
    });

    await block.save();

    res.status(201).json({
      success: true,
      message: 'Utilisateur bloqué avec succès',
      data: block,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Débloquer un utilisateur
 */
export const unblockUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
): Promise<void> => {
  try {
    const { blockId } = req.params;
    const userId = req.user?.userId;

    const block = await Block.findById(blockId);
    if (!block) {
      throw new ApiError(404, 'Blocage introuvable');
    }

    // Vérifier que c'est le créateur du blocage
    if (block.blocker.toString() !== userId) {
      throw new ApiError(403, 'Vous ne pouvez pas débloquer ce blocage');
    }

    await Block.findByIdAndDelete(blockId);

    res.status(200).json({
      success: true,
      message: 'Utilisateur débloqué avec succès',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer la liste des utilisateurs bloqués par l'utilisateur
 */
export const getBlockedUsers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    const blocks = await Block.find({ blocker: userId })
      .populate('blocked', 'firstName lastName email')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      data: blocks,
    });
  } catch (error) {
    next(error);
  }
};

/* ───────── Fonctions utilitaires ───────── */

/**
 * Interface pour les avertissements de sécurité
 */
interface SecurityWarnings {
  hasExternalLinks: boolean;
  externalLinks: string[];
  hasPhoneNumbers: boolean;
  phoneNumbers: string[];
  hasEmails: boolean;
  emails: string[];
  warnings: string[];
}

/**
 * Analyser le contenu du message pour les éléments suspects
 */
function analyzeMessageSecurity(content: string): SecurityWarnings {
  const linkAnalysis = detectExternalLinks(content);
  const phoneAnalysis = detectPhoneNumbers(content);
  const emailAnalysis = detectEmails(content);

  const warnings: string[] = [];

  if (linkAnalysis.hasLinks) {
    warnings.push('⚠️ Liens externes détectés - Vérifiez avant de cliquer');
  }

  if (phoneAnalysis.hasPhoneNumbers) {
    warnings.push('⚠️ Numéro de téléphone détecté - Attention aux arnaques');
  }

  if (emailAnalysis.hasEmails) {
    warnings.push('⚠️ Email détecté - Ne cliquez pas sur les liens suspects');
  }

  return {
    hasExternalLinks: linkAnalysis.hasLinks,
    externalLinks: linkAnalysis.links,
    hasPhoneNumbers: phoneAnalysis.hasPhoneNumbers,
    phoneNumbers: phoneAnalysis.numbers,
    hasEmails: emailAnalysis.hasEmails,
    emails: emailAnalysis.emails,
    warnings,
  };
}
