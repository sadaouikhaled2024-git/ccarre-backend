import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import Report, { ReportType, ReportReason } from '../models/signalement.model';
import User from '../models/user.model';
import Annonce from '../models/annonce.model';
import ApiError from '../utils/ApiError';

/**
 * Créer un nouveau signalement
 */
export const createReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { type, targetId, reason, description } = req.body;
    const reportedBy = req.user?.userId;

    console.log('[REPORT] Creating report:', { type, targetId, reason, descriptionLength: description?.length, reportedBy });

    // Validation des paramètres
    if (!type || !targetId || !reason || !description) {
      throw new ApiError(400, 'Tous les champs sont requis');
    }

    if (!Object.values(ReportType).includes(type)) {
      const validTypes = Object.values(ReportType).join(', ');
      throw new ApiError(400, `Type de signalement invalide. Valides: ${validTypes}`);
    }

    if (!Object.values(ReportReason).includes(reason)) {
      const validReasons = Object.values(ReportReason).join(', ');
      throw new ApiError(400, `Raison invalide: "${reason}". Raisons valides: ${validReasons}`);
    }

    // Vérifier que la cible existe
    let target;
    let targetType = '';

    if (type === ReportType.ANNONCE) {
      target = await Annonce.findById(targetId);
      targetType = 'Annonce';

      if (!target) {
        throw new ApiError(404, 'Annonce introuvable');
      }
    } else if (type === ReportType.USER) {
      console.log('[REPORT] Looking for user:', targetId);
      target = await User.findById(targetId);
      targetType = 'User';

      console.log('[REPORT] User found:', target ? `User ${target._id}` : 'NOT FOUND');

      if (!target) {
        throw new ApiError(404, 'Utilisateur introuvable');
      }
      
      // Vérifier qu'on ne signale pas soi-même
      if (target._id.toString() === reportedBy?.toString()) {
        throw new ApiError(400, "Vous ne pouvez pas vous signaler vous-même");
      }
    } else if (type === ReportType.MESSAGE) {
      targetType = 'Message';
    }

    // Vérifier qu'on ne signale pas son propre contenu
    if (
      type === ReportType.ANNONCE &&
      (target as any)?.owner?.toString() === reportedBy
    ) {
      throw new ApiError(400, "Vous ne pouvez pas signaler votre propre annonce");
    }

    // Créer le report
    const report = new Report({
      type,
      targetId,
      targetType,
      reportedBy,
      reason,
      description,
      priority: determinePriority(reason),
      status: 'ouvert',
    });

    await report.save();

    console.log('[REPORT] Report created successfully:', report._id);

    // Augmenter le compteur de signalements pour l'annonce/utilisateur
    if (type === ReportType.ANNONCE) {
      const annonce = await Annonce.findById(targetId);
      if (annonce) {
        const originalRiskScore = annonce.riskScore || 0;
        annonce.reportCount = (annonce.reportCount || 0) + 1;

        // Recalculer le risque de l'annonce après chaque signalement
        const user = await User.findById(annonce.owner);
        const userRiskScore = user?.riskScore || 0;
        const daysSinceCreation = Math.floor(
          (Date.now() - annonce.createdAt.getTime()) / (1000 * 60 * 60 * 24),
        );
        const isRecentAccount = daysSinceCreation < 7;

        const riskScore = calculateAnnonceRiskScore({
          keywordRiskScore: annonce.riskScore || 0,
          reportCount: annonce.reportCount,
          userRiskScore,
          isRecentAccount,
        });

        const riskScoreDelta = riskScore - originalRiskScore;
        report.riskScoreDelta = riskScoreDelta;

        annonce.riskScore = riskScore;
        annonce.isSuspicious = riskScore >= 40;

        await annonce.save();
        await report.save();

        console.log('[REPORT] Annonce updated:', { id: targetId, reportCount: annonce.reportCount, riskScore: annonce.riskScore, delta: riskScoreDelta });
      }
    } else if (type === ReportType.USER) {
      const user = await User.findById(targetId);
      if (user) {
        user.reportCount = (user.reportCount || 0) + 1;
        const currentRisk = user.riskScore ?? 0;
        const riskScoreDelta = 5;
        user.riskScore = Math.min(currentRisk + riskScoreDelta, 100);
        report.riskScoreDelta = riskScoreDelta;
        await user.save();
        await report.save();

        console.log('[REPORT] User updated:', { id: targetId, reportCount: user.reportCount, riskScore: user.riskScore, delta: riskScoreDelta });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Signalement créé avec succès',
      data: report,
    });
  } catch (error) {
    console.error('[REPORT] Error creating report:', error);
    next(error);
  }
};

/**
 * Récupérer tous les signalements de l'utilisateur
 */
export const getMyReports = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skipNum = (pageNum - 1) * limitNum;

    const reports = await Report.find({ reportedBy: userId })
      .sort('-createdAt')
      .skip(skipNum)
      .limit(limitNum);

    const total = await Report.countDocuments({ reportedBy: userId });

    res.status(200).json({
      success: true,
      data: reports,
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
 * Récupérer les détails d'un signalement
 */
export const getReportDetail = async (
  req: AuthenticatedRequest,
  res: Response,
  next: any,
): Promise<void> => {
  try {
    const { reportId } = req.params;
    const userId = req.user?.userId;

    const report = await Report.findById(reportId)
      .populate('reportedBy', 'firstName lastName')
      .populate('resolvedBy', 'firstName lastName');

    if (!report) {
      throw new ApiError(404, 'Signalement introuvable');
    }

    // Vérifier que l'utilisateur est le créateur du report
    if ((report.reportedBy as any).toString() !== userId) {
      throw new ApiError(403, 'Accès refusé');
    }

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lister tous les signalements (admin)
 */
export const listReports = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const reports = await Report.find()
      .populate('reportedBy', 'firstName lastName email')
      .populate('resolvedBy', 'firstName lastName email');

    res.status(200).json({ success: true, data: reports });
  } catch (error) {
    next(error);
  }
};

/* ───────── Fonctions utilitaires ───────── */

/**
 * Déterminer la priorité en fonction de la raison
 */
function determinePriority(reason: string): string {
  if (!reason) return 'normal';
  
  const urgentReasons = ['arnaque', 'contact_externe', 'illegal'];
  const reasonLower = reason.toLowerCase();
  
  if (urgentReasons.some(r => reasonLower.includes(r))) {
    return 'urgent';
  }

  return 'normal';
}

/**
 * Calculer le score de risque d'une annonce
 */
function calculateAnnonceRiskScore(params: {
  keywordRiskScore: number;
  reportCount: number;
  userRiskScore: number;
  isRecentAccount: boolean;
}): number {
  let score = 0;

  score += params.keywordRiskScore;
  score += Math.min(params.reportCount * 10, 40);
  score += params.userRiskScore * 0.5;

  if (params.isRecentAccount) {
    score += 15;
  }

  return Math.min(score, 100);
}
