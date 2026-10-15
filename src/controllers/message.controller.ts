import { Request, Response, NextFunction } from 'express';
import Message from '../models/message.model';
import Echange, { EchangeStatus } from '../models/echange.model';
import ApiError from '../utils/ApiError';
import { isBlockedBetween } from './block.controller';
import { uploadImageToCloudinary } from '../config/cloudinary';

/* ────────────────────────────────────────────
   POST /api/messages
   Send a message in an exchange
   ──────────────────────────────────────────── */
export const sendMessage = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { echangeId, contenu } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(401, 'Utilisateur non authentifié');
    }

    if (!echangeId || !contenu) {
      throw new ApiError(400, "L'ID de l'échange et le contenu sont requis");
    }

    // Vérifier que l'échange existe
    const echange = await Echange.findById(echangeId);
    if (!echange) {
      throw new ApiError(404, "L'échange n'existe pas");
    }

    // Vérifier que l'utilisateur est impliqué dans l'échange
    const isInvolved =
      echange.utilisateurDemandeur.toString() === userId ||
      echange.utilisateurProprietaire.toString() === userId;

    if (!isInvolved) {
      throw new ApiError(403, "Vous ne pouvez pas envoyer de message dans cet échange");
    }

    // Check exchange status - messaging only allowed when ACCEPTE or TERMINE (read-only)
    if (echange.statut === EchangeStatus.EN_ATTENTE) {
      throw new ApiError(400, "Les messages ne peuvent être envoyés que lorsque l'échange est accepté");
    }

    if (echange.statut === EchangeStatus.REFUSE) {
      throw new ApiError(400, "Vous ne pouvez pas envoyer de messages dans un échange refusé");
    }

    if (echange.statut === EchangeStatus.ANNULE) {
      throw new ApiError(400, "Vous ne pouvez pas envoyer de messages dans un échange annulé");
    }

    const otherUser =
      echange.utilisateurDemandeur.toString() === userId
        ? echange.utilisateurProprietaire.toString()
        : echange.utilisateurDemandeur.toString();

    if (await isBlockedBetween(userId, otherUser)) {
      throw new ApiError(403, 'Envoi impossible : vous avez bloqué cet utilisateur ou il vous a bloqué');
    }

    // Créer le message
    const message = await Message.create({
      echangeId,
      expediteur: userId,
      contenu,
    });

    const populatedMessage = await message.populate('expediteur');

    res.status(201).json({
      success: true,
      message: 'Message envoyé',
      data: populatedMessage,
    });
  } catch (error) {
    next(error);
  }
};

/* ────────────────────────────────────────────
   POST /api/messages/upload-image
   Upload an image for a message to Cloudinary
   ──────────────────────────────────────────── */
export const uploadMessageImage = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const file = (req as any).file as Express.Multer.File | undefined;

    if (!userId) {
      throw new ApiError(401, 'Utilisateur non authentifié');
    }

    if (!file) {
      throw new ApiError(400, 'Aucune image fournie');
    }

    const url = await uploadImageToCloudinary(file.buffer);

    res.status(201).json({
      success: true,
      url,
    });
  } catch (error) {
    next(error);
  }
};

/* ────────────────────────────────────────────
   GET /api/messages/:echangeId
   Get all messages for an exchange
   ──────────────────────────────────────────── */
export const getMessagesByEchange = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { echangeId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(401, 'Utilisateur non authentifié');
    }

    // Vérifier que l'échange existe
    const echange = await Echange.findById(echangeId);
    if (!echange) {
      throw new ApiError(404, "L'échange n'existe pas");
    }

    // Vérifier que l'utilisateur est impliqué dans l'échange
    const isInvolved =
      echange.utilisateurDemandeur.toString() === userId ||
      echange.utilisateurProprietaire.toString() === userId;

    if (!isInvolved) {
      throw new ApiError(403, "Vous n'avez pas accès aux messages de cet échange");
    }

    const messages = await Message.find({ echangeId })
      .populate('expediteur')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};
