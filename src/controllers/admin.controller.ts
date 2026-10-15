import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import Annonce from '../models/annonce.model';
import User, { UserRole } from '../models/user.model';
import Report from '../models/signalement.model';
import Message from '../models/message.model';
import Block from '../models/block.model';
import ApiError from '../utils/ApiError';

/* ═══════════════════════════════════════════════════════════════════════════
    GESTION DES ANNONCES
═══════════════════════════════════════════════════════════════════════════ */

export const listAnnoncesAdmin = async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const annonces = await Annonce.find().populate('owner', 'firstName lastName email');
    res.status(200).json({ success: true, data: annonces });
  } catch (error) {
    next(error);
  }
};

export const getAnnonceDetail = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
): Promise<void> => {
  try {
    const { id } = req.params;

    const annonce = await Annonce.findById(id)
      .populate('owner', 'firstName lastName email')
      .populate({
        path: 'owner',
        select: 'riskScore reportCount isBanned',
      });

    if (!annonce) {
      throw new ApiError(404, 'Annonce introuvable');
    }

    // Récupérer les signalements associés
    const reports = await Report.find({ targetId: id, type: 'annonce' })
      .populate('reportedBy', 'firstName lastName email')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      data: {
        annonce,
        reports,
        reportCount: reports.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAnnonce = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason = 'Contenu violant les règles' } = req.body;

    const annonce = await Annonce.findById(id);
    if (!annonce) {
      throw new ApiError(404, 'Annonce introuvable');
    }

    // Marquer comme supprimée au lieu de supprimer complètement
    annonce.status = 'supprimee' as any;
    await annonce.save();

    // Logger l'action
    const adminId = req.user?.userId;
    console.log(`[ADMIN] Annonce supprimée: ${id} par: ${adminId} - Raison: ${reason}`);

    res.status(200).json({
      success: true,
      message: 'Annonce supprimée avec succès',
      data: annonce,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/annonces/:id/hard-delete
 * Permanently delete annonce from database
 */
export const hardDeleteAnnonce = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason = 'Suppression définitive' } = req.body;

    const annonce = await Annonce.findById(id);
    if (!annonce) {
      throw new ApiError(404, 'Annonce introuvable');
    }

    const adminId = req.user?.userId;
    const annonceTitle = annonce.title;

    // Hard delete from database
    await Annonce.findByIdAndDelete(id);

    console.log(`[ADMIN ACTION] ${new Date().toISOString()} - Admin: ${adminId} | DELETE /annonces/${id}/hard-delete | Suppression définitive d'une annonce: ${annonceTitle}`);

    res.status(200).json({
      success: true,
      message: 'Annonce supprimée définitivement',
      data: { id, title: annonceTitle },
    });
  } catch (error) {
    next(error);
  }
};

export const updateAnnonceRiskScore = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { riskScore, reasons } = req.body;

    const annonce = await Annonce.findById(id);
    if (!annonce) {
      throw new ApiError(404, 'Annonce introuvable');
    }

    annonce.riskScore = riskScore;
    annonce.isSuspicious = riskScore >= 40;

    if (reasons && Array.isArray(reasons)) {
      annonce.suspiciousReasons = reasons;
    }

    await annonce.save();

    res.status(200).json({
      success: true,
      message: 'Score de risque mis à jour',
      data: annonce,
    });
  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
    GESTION DES UTILISATEURS
═══════════════════════════════════════════════════════════════════════════ */

export const listUsers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
): Promise<void> => {
  try {
    const { filter = 'all', page = 1, limit = 20 } = req.query;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skipNum = (pageNum - 1) * limitNum;

    let query = {};

    if (filter === 'banned') {
      query = { isBanned: true };
    } else if (filter === 'high-risk') {
      query = { riskScore: { $gte: 50 } };
    } else if (filter === 'suspected') {
      query = { reportCount: { $gt: 2 } };
    }

    const users = await User.find(query)
      .select('-password')
      .sort('-createdAt')
      .skip(skipNum)
      .limit(limitNum);

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: users,
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

export const banUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      throw new ApiError(400, 'Raison du bannissement requise');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'Utilisateur introuvable');
    }

    // Éviter de bannir les admins
    if (user.role === 'admin') {
      throw new ApiError(400, 'Impossible de bannir un administrateur');
    }

    user.isBanned = true;
    user.bannedReason = reason;
    await user.save();

    // Logger l'action
    console.log(`[ADMIN] Utilisateur banni: ${userId} - Raison: ${reason}`);

    res.status(200).json({
      success: true,
      message: 'Utilisateur banni avec succès',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const unbanUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'Utilisateur introuvable');
    }

    user.isBanned = false;
    user.bannedReason = undefined;
    await user.save();

    console.log(`[ADMIN] Utilisateur débanni: ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Utilisateur débanni avec succès',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/users/:userId
 * Hard delete user account (completely remove from DB)
 */
export const deleteUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'Utilisateur introuvable');
    }

    // Éviter de supprimer les admins
    if (user.role === 'admin') {
      throw new ApiError(400, 'Impossible de supprimer un administrateur');
    }

    const adminId = req.user?.userId;
    
    // Delete user
    await User.findByIdAndDelete(userId);

    console.log(`[ADMIN ACTION] ${new Date().toISOString()} - Admin: ${adminId} | DELETE /users/${userId} | Suppression d'un utilisateur`);

    res.status(200).json({
      success: true,
      message: 'Utilisateur supprimé avec succès',
      data: { userId },
    });
  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
    GESTION DES SIGNALEMENTS
═══════════════════════════════════════════════════════════════════════════ */

export const listReports = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
): Promise<void> => {
  try {
    const { status = 'all', priority = 'all', page = 1, limit = 20 } = req.query;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skipNum = (pageNum - 1) * limitNum;

    let query = {};

    if (status !== 'all') {
      query = { ...query, status };
    }

    if (priority !== 'all') {
      query = { ...query, priority };
    }

    const reports = await Report.find(query)
      .populate('reportedBy', 'firstName lastName email')
      .populate('resolvedBy', 'firstName lastName email')
      .sort('-createdAt')
      .skip(skipNum)
      .limit(limitNum)
      .lean();

    // Fetch target data (annonce, user, or message) separately
    const reportsWithTargetData = await Promise.all(
      reports.map(async (report: any) => {
        const reportObj = { ...report };
        
        try {
          console.log(`[DEBUG] Processing report - ID: ${reportObj._id}, type: ${reportObj.type}, targetId: ${reportObj.targetId}`);
          
          if (reportObj.type === 'annonce') {
            console.log(`[DEBUG] Fetching annonce with ID: ${reportObj.targetId}`);
            const annonce = await Annonce.findById(reportObj.targetId)
              .select('title description images category price status owner')
              .populate('owner', 'firstName lastName email')
              .lean();
            console.log(`[DEBUG] Annonce result:`, annonce ? 'FOUND' : 'NOT FOUND');
            if (annonce) {
              reportObj.targetData = annonce;
            }
          } else if (reportObj.type === 'user') {
            console.log(`[DEBUG] Fetching user with ID: ${reportObj.targetId}`);
            const targetUser = await User.findById(reportObj.targetId)
              .select('firstName lastName email riskScore reportCount isBanned createdAt')
              .lean();
            console.log(`[DEBUG] User result:`, targetUser ? 'FOUND' : 'NOT FOUND');
            if (targetUser) {
              reportObj.targetData = targetUser;
            }
          } else if (reportObj.type === 'message') {
            console.log(`[DEBUG] Fetching message with ID: ${reportObj.targetId}`);
            const message = await Message.findById(reportObj.targetId)
              .select('contenu images expediteur timestamp')
              .populate('expediteur', 'firstName lastName email')
              .lean();
            console.log(`[DEBUG] Message result:`, message ? 'FOUND' : 'NOT FOUND');
            if (message) {
              reportObj.targetData = message;
            }
          }
        } catch (err) {
          console.error(`Error fetching target data for report ${reportObj._id}:`, err);
        }
        
        return reportObj;
      })
    );

    const total = await Report.countDocuments(query);

    res.status(200).json({
      success: true,
      data: reportsWithTargetData,
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

export const updateReportStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
): Promise<void> => {
  try {
    const { reportId } = req.params;
    const { status, priority, adminNotes } = req.body;

    if (!reportId) {
      throw new ApiError(400, 'ID du signalement requis');
    }

    // Récupérer le rapport avant de le mettre à jour pour connaître la cible
    const report = await Report.findById(reportId);
    if (!report) {
      throw new ApiError(404, 'Signalement introuvable');
    }

    // Prepare update object with only the fields we're changing
    const updateData: any = {};
    
    if (status) {
      // Valider le statut
      const validStatuses = ['ouvert', 'en_cours', 'resolu'];
      if (!validStatuses.includes(status)) {
        throw new ApiError(400, `Statut invalide: ${status}`);
      }
      updateData.status = status;
    }

    if (priority) {
      // Valider la priorité
      const validPriorities = ['urgent', 'high', 'normal', 'low'];
      if (!validPriorities.includes(priority)) {
        throw new ApiError(400, `Priorité invalide: ${priority}`);
      }
      updateData.priority = priority;
    }

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    // If status is being resolved, add resolver info
    if (status === 'resolu') {
      updateData.resolvedBy = req.user?.userId;
      updateData.resolvedAt = new Date();
    }

    // Use findByIdAndUpdate with validation disabled for PATCH operations
    // to avoid re-validating required fields that are already on the document
    const updatedReport = await Report.findByIdAndUpdate(
      reportId,
      updateData,
      { 
        new: true,
        runValidators: false // Disable validation for partial updates
      }
    );

    console.log(`[REPORT] Report status updated: ${reportId} -> ${status}`);

    res.status(200).json({
      success: true,
      message: 'Signalement mis à jour',
      data: updatedReport,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
): Promise<void> => {
  try {
    const { reportId } = req.params;

    const report = await Report.findByIdAndDelete(reportId);
    if (!report) {
      throw new ApiError(404, 'Signalement introuvable');
    }

    res.status(200).json({
      success: true,
      message: 'Signalement supprimé',
    });
  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
    GESTION DES MESSAGES
═══════════════════════════════════════════════════════════════════════════ */

export const listMessages = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
): Promise<void> => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skipNum = (pageNum - 1) * limitNum;

    const messages = await Message.find()
      .populate('expediteur', 'firstName lastName email')
      .populate('echangeId')
      .sort('-createdAt')
      .skip(skipNum)
      .limit(limitNum);

    const total = await Message.countDocuments();

    res.status(200).json({
      success: true,
      data: messages,
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

export const deleteMessage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
): Promise<void> => {
  try {
    const { messageId } = req.params;
    const { reason = 'Contenu violant les règles' } = req.body;

    const message = await Message.findByIdAndDelete(messageId);
    if (!message) {
      throw new ApiError(404, 'Message introuvable');
    }

    console.log(`[ADMIN] Message supprimé: ${messageId} - Raison: ${reason}`);

    res.status(200).json({
      success: true,
      message: 'Message supprimé',
    });
  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
    GESTION DES BLOCAGES
═══════════════════════════════════════════════════════════════════════════ */

export const listBlockedUsers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
): Promise<void> => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const skipNum = (pageNum - 1) * limitNum;

    const blocks = await Block.find()
      .populate('blocker', 'firstName lastName email')
      .populate('blocked', 'firstName lastName email')
      .sort('-createdAt')
      .skip(skipNum)
      .limit(limitNum);

    const total = await Block.countDocuments();

    res.status(200).json({
      success: true,
      data: blocks,
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

export const unblockUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
): Promise<void> => {
  try {
    const { blockId } = req.params;

    const block = await Block.findByIdAndDelete(blockId);
    if (!block) {
      throw new ApiError(404, 'Blocage introuvable');
    }

    res.status(200).json({
      success: true,
      message: 'Utilisateur débloqué',
    });
  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
    DASHBOARD STATS
═══════════════════════════════════════════════════════════════════════════ */

export const getDashboardStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
): Promise<void> => {
  try {
    // Total annonces
    const totalAnnonces = await Annonce.countDocuments({
      status: { $ne: 'supprimee' },
    });

    // Annonces signalées (avec au moins 1 signalement)
    const reportedAnnonces = await Annonce.countDocuments({
      reportCount: { $gt: 0 },
      status: { $ne: 'supprimee' },
    });

    // Annonces haut risque (score >= 50)
    const highRiskAnnonces = await Annonce.countDocuments({
      riskScore: { $gte: 50 },
      status: { $ne: 'supprimee' },
    });

    // Total utilisateurs actifs
    const totalUsers = await User.countDocuments({
      isBanned: false,
    });

    // Utilisateurs bannis
    const bannedUsers = await User.countDocuments({
      isBanned: true,
    });

    // Total signalements
    const totalReports = await Report.countDocuments();

    // Signalements ouverts
    const openReports = await Report.countDocuments({
      status: { $in: ['ouvert', 'en_attente'] },
    });

    // Signalements urgents (haute priorité)
    const urgentReports = await Report.countDocuments({
      priority: 'haute',
      status: { $in: ['ouvert', 'en_attente'] },
    });

    res.status(200).json({
      success: true,
      data: {
        totalAnnonces,
        reportedAnnonces,
        highRiskAnnonces,
        totalUsers,
        bannedUsers,
        totalReports,
        openReports,
        urgentReports,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/* ═══════════════════════════════════════════════════════════════════════════
    ANALYTICS
═══════════════════════════════════════════════════════════════════════════ */

export const getAnalytics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
): Promise<void> => {
  try {
    const { period = '7d' } = req.query;

    // Calculer la date de début selon la période
    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
    }

    // Annonces supprimées
    const deletedAnnonces = await Annonce.countDocuments({
      updatedAt: { $gte: startDate },
      status: 'supprimee',
    });

    // Utilisateurs bannis
    const bannedUsersCount = await User.countDocuments({
      updatedAt: { $gte: startDate },
      isBanned: true,
    });

    // Messages envoyés
    const sentMessages = await Message.countDocuments({
      createdAt: { $gte: startDate },
    });

    // Nouvelles annonces
    const newAnnonces = await Annonce.countDocuments({
      createdAt: { $gte: startDate },
    });

    // Signalements
    const newReports = await Report.countDocuments({
      createdAt: { $gte: startDate },
    });

    // Nouveaux utilisateurs
    const newUsers = await User.countDocuments({
      createdAt: { $gte: startDate },
    });

    res.status(200).json({
      success: true,
      data: {
        period,
        startDate,
        endDate: new Date(),
        deletedAnnonces,
        bannedUsersCount,
        sentMessages,
        newAnnonces,
        newReports,
        newUsers,
      },
    });
  } catch (error) {
    next(error);
  }
};
