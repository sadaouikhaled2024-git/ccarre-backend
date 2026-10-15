import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import Report, { ReportType, ReportStatus } from '../models/signalement.model';
import User from '../models/user.model';
import Annonce from '../models/annonce.model';
import Message from '../models/message.model';
import Notification from '../models/notification.model';
import ApiError from '../utils/ApiError';

/* ───────────────────────────────────────────
   LOGS & AUDIT TRAIL
   ─────────────────────────────────────────── */

const logReportAction = (action: string, userId: string, details?: any) => {
  const timestamp = new Date().toISOString();
  console.log(
    `[SIGNALEMENT-ADMIN v2.0.0] ${timestamp} | ACTION: ${action} | ADMIN: ${userId}`,
    details || '',
  );
};

/**
 * GET /api/reports/admin/list
 * Liste tous les signalements avec filtres (admin only)
 */
export const listReportsForAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status, type, priority, reason, page = 1, limit = 20 } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (reason) filter.reason = reason;

    const skip = (Number(page) - 1) * Number(limit);

    const reports = await Report.find(filter)
      .populate('reportedBy', 'firstName lastName email')
      .populate('resolvedBy', 'firstName lastName email')
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
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

    const total = await Report.countDocuments(filter);

    logReportAction('LIST_REPORTS_ADMIN', req.user!.userId, {
      filters: Object.keys(filter),
      total,
      page: Number(page),
      limit: Number(limit),
    });

    res.status(200).json({
      success: true,
      message: 'Signalements récupérés',
      data: reportsWithTargetData,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/admin/search
 * Recherche les signalements par ID ou mot-clé (admin only)
 * Query params:
 *   - q (keyword): Recherche dans description, raison, ID du rapport
 *   - id: Recherche par ID exact du rapport
 *   - type: Filtrer par type (annonce, user, message)
 *   - status: Filtrer par statut (ouvert, en_cours, resolu)
 *   - page: Numéro de page (défaut: 1)
 *   - limit: Résultats par page (défaut: 20)
 */
export const searchReports = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { q, id, type, status, page = 1, limit = 20 } = req.query;

    const filter: any = {};
    
    // Recherche par ID exact du rapport
    if (id) {
      filter._id = id;
    }
    
    // Recherche par mot-clé (description, raison)
    if (q) {
      filter.$or = [
        { description: { $regex: q, $options: 'i' } }, // case-insensitive
        { reason: { $regex: q, $options: 'i' } },
        { adminNotes: { $regex: q, $options: 'i' } },
      ];
    }

    // Filtres additionnels
    if (type) filter.type = type;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const reports = await Report.find(filter)
      .populate('reportedBy', 'firstName lastName email')
      .populate('resolvedBy', 'firstName lastName email')
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    // Fetch target data (annonce, user, or message) separately
    const reportsWithTargetData = await Promise.all(
      reports.map(async (report: any) => {
        const reportObj = { ...report };
        
        try {
          if (reportObj.type === 'annonce') {
            const annonce = await Annonce.findById(reportObj.targetId)
              .select('title description images category price status owner')
              .populate('owner', 'firstName lastName email')
              .lean();
            if (annonce) {
              reportObj.targetData = annonce;
            }
          } else if (reportObj.type === 'user') {
            const targetUser = await User.findById(reportObj.targetId)
              .select('firstName lastName email riskScore reportCount isBanned createdAt')
              .lean();
            if (targetUser) {
              reportObj.targetData = targetUser;
            }
          } else if (reportObj.type === 'message') {
            const message = await Message.findById(reportObj.targetId)
              .select('contenu images expediteur timestamp')
              .populate('expediteur', 'firstName lastName email')
              .lean();
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

    const total = await Report.countDocuments(filter);

    logReportAction('SEARCH_REPORTS', req.user!.userId, {
      query: q || id,
      filters: { type: type || 'all', status: status || 'all' },
      resultsFound: total,
      page: Number(page),
      limit: Number(limit),
    });

    res.status(200).json({
      success: true,
      message: `${total} signalement(s) trouvé(s)`,
      data: reportsWithTargetData,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
      searchQuery: {
        keyword: q || null,
        reportId: id || null,
        type: type || 'all',
        status: status || 'all',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/admin/stats
 * Récupère les statistiques des signalements (admin only)
 */
export const getReportStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const stats = await Report.aggregate([
      {
        $facet: {
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
            {
              $sort: { _id: 1 },
            },
          ],
          byType: [
            {
              $group: {
                _id: '$type',
                count: { $sum: 1 },
              },
            },
          ],
          byReason: [
            {
              $group: {
                _id: '$reason',
                count: { $sum: 1 },
              },
            },
            {
              $sort: { count: -1 },
            },
          ],
          byPriority: [
            {
              $group: {
                _id: '$priority',
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    const total = await Report.countDocuments();
    const openReports = await Report.countDocuments({ status: 'OUVERT' });
    const inProgressReports = await Report.countDocuments({ status: 'EN_COURS' });
    const resolvedReports = await Report.countDocuments({ status: 'RESOLU' });

    logReportAction('GET_REPORT_STATS', req.user!.userId, {
      total,
      open: openReports,
      inProgress: inProgressReports,
      resolved: resolvedReports,
    });

    res.status(200).json({
      success: true,
      message: 'Statistiques récupérées',
      data: {
        summary: {
          total,
          open: openReports,
          inProgress: inProgressReports,
          resolved: resolvedReports,
        },
        breakdowns: stats[0],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/reports/admin/:id/status
 * Passe le rapport à EN_COURS pour investigation (admin only)
 * Les autres statuts sont automatisés:
 * - OUVERT: création (par défaut) ou quand action = NONE
 * - EN_COURS: via cette fonction pour investigation
 * - RESOLU: automatique quand action prise (BAN_USER, WARN_USER, REMOVE_ANNONCE)
 */
export const updateReportStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;

    const report = await Report.findById(id);
    if (!report) {
      throw new ApiError(404, 'Signalement introuvable');
    }

    // Le statut passe automatiquement à EN_COURS
    const newStatus = 'en_cours';

    const updated = await Report.findByIdAndUpdate(
      id,
      {
        status: newStatus,
        adminNotes: adminNotes || report.adminNotes,
      },
      { returnDocument: 'after', runValidators: true },
    )
      .populate('reportedBy', 'firstName lastName email')
      .populate('resolvedBy', 'firstName lastName email');

    logReportAction('UPDATE_REPORT_STATUS', req.user!.userId, {
      reportId: id,
      oldStatus: report.status,
      newStatus,
      adminNotes: adminNotes ? 'Notes ajoutées' : 'Pas de nouvelles notes',
    });

    res.status(200).json({
      success: true,
      message: 'Signalement marqué comme En cours pour investigation',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/reports/admin/:id/resolve
 * Résout un signalement avec action (admin only)
 */
export const resolveReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { adminNotes, action } = req.body;

    // Action est requis pour résoudre un rapport
    if (!action) {
      throw new ApiError(400, 'Une action est requise (BAN_USER, WARN_USER, REMOVE_ANNONCE, ou NONE)');
    }

    const report = await Report.findById(id);
    if (!report) {
      throw new ApiError(404, 'Signalement introuvable');
    }

    let actionResult: any = null;
    let reportStatus = 'ouvert'; // Par défaut, reste ouvert

    // Exécuter l'action si applicable
    if (action === 'BAN_USER' && report.type === ReportType.USER) {
      const user = await User.findByIdAndUpdate(
        report.targetId,
        {
          isBanned: true,
          bannedReason: adminNotes || 'Compte banni suite à un signalement',
        },
        { returnDocument: 'after' },
      );

      // Créer notification à l'utilisateur banni
      if (user) {
        await Notification.create({
          user: report.targetId,
          contenu: `Votre compte a été suspendu pour la raison suivante: ${adminNotes || 'Violation des conditions d\'utilisation'}`,
          type: 'BAN_WARNING',
          read: false,
        });
      }

      actionResult = {
        action: 'BAN_USER',
        executed: !!user,
        targetUser: user ? `${user.firstName} ${user.lastName}` : 'Utilisateur non trouvé',
        targetEmail: user?.email,
        notificationSent: !!user,
        timestamp: new Date().toISOString(),
      };
      
      // L'action a été prise → rapport résolu
      reportStatus = 'resolu';
    } else if (action === 'REMOVE_ANNONCE' && report.type === ReportType.ANNONCE) {
      const annonce = await Annonce.findByIdAndDelete(report.targetId);

      // Créer notification au propriétaire de l'annonce
      if (annonce && annonce.owner) {
        await Notification.create({
          user: annonce.owner,
          contenu: `Votre annonce "${annonce.title}" a été supprimée pour la raison suivante: ${adminNotes || 'Violation des conditions d\'utilisation'}`,
          type: 'ANNONCE_REMOVED',
          read: false,
        });
      }

      actionResult = {
        action: 'REMOVE_ANNONCE',
        executed: !!annonce,
        targetAnnonce: annonce?.title || 'Annonce non trouvée',
        targetOwner: annonce?.owner || 'Propriétaire non trouvé',
        notificationSent: !!annonce?.owner,
        timestamp: new Date().toISOString(),
      };
      
      // L'action a été prise → rapport résolu
      reportStatus = 'resolu';
    } else if (action === 'WARN_USER' && report.type === ReportType.USER) {
      // Créer notification d'avertissement
      await Notification.create({
        user: report.targetId,
        contenu: `Vous avez reçu un avertissement pour la raison suivante: ${adminNotes || 'Violation des conditions d\'utilisation'}`,
        type: 'USER_WARNING',
        read: false,
      });

      actionResult = {
        action: 'WARN_USER',
        executed: true,
        message: 'Avertissement enregistré',
        notificationSent: true,
        timestamp: new Date().toISOString(),
      };
      
      // L'action a été prise → rapport résolu
      reportStatus = 'resolu';
    } else if (action === 'NONE') {
      actionResult = {
        action: 'NONE',
        executed: true,
        message: 'Aucune action automatique - rapport reste ouvert',
        timestamp: new Date().toISOString(),
      };
      
      // Aucune action → rapport reste ouvert
      reportStatus = 'ouvert';
    } else {
      throw new ApiError(400, 'Action invalide. Doit être: BAN_USER, WARN_USER, REMOVE_ANNONCE, ou NONE');
    }

    // Mettre à jour le signalement avec le statut automatisé
    const updated = await Report.findByIdAndUpdate(
      id,
      {
        status: reportStatus,
        adminNotes: adminNotes || report.adminNotes,
        resolvedBy: req.user!.userId,
        resolvedAt: reportStatus === 'resolu' ? new Date() : undefined,
      },
      { returnDocument: 'after', runValidators: true },
    )
      .populate('reportedBy', 'firstName lastName email')
      .populate('resolvedBy', 'firstName lastName email');

    logReportAction('RESOLVE_REPORT', req.user!.userId, {
      reportId: id,
      status: reportStatus,
      action,
      actionExecuted: actionResult?.executed,
    });

    res.status(200).json({
      success: true,
      message: action === 'NONE' 
        ? 'Rapport noté, statut reste ouvert' 
        : `Action exécutée - Rapport résolu`,
      data: {
        report: updated,
        actionTaken: actionResult,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/reports/admin/:id
 * Supprime un signalement (admin only)
 */
export const deleteReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const report = await Report.findByIdAndDelete(id);
    if (!report) {
      throw new ApiError(404, 'Signalement introuvable');
    }

    logReportAction('DELETE_REPORT', req.user!.userId, {
      reportId: id,
      type: report.type,
      reason: report.reason,
    });

    res.status(200).json({
      success: true,
      message: 'Signalement supprimé',
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/reports/admin/bulk-update
 * Met à jour plusieurs signalements en masse (admin only)
 */
export const bulkUpdateReports = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { reportIds, status, action, adminNotes } = req.body;

    if (!Array.isArray(reportIds) || reportIds.length === 0) {
      throw new ApiError(400, 'reportIds doit être un tableau non-vide');
    }

    const validStatuses = ['OUVERT', 'EN_COURS', 'RESOLU', 'REJETE'];
    if (status && !validStatuses.includes(status)) {
      throw new ApiError(400, 'Statut invalide');
    }

    const results = await Promise.all(
      reportIds.map(async (reportId) => {
        try {
          const report = await Report.findById(reportId);
          if (!report) return { reportId, success: false, error: 'Signalement non trouvé' };

          // Exécuter l'action si applicable
          if (action === 'BAN_USER' && report.type === ReportType.USER) {
            await User.findByIdAndUpdate(report.targetId, {
              isBanned: true,
              bannedReason: adminNotes || 'Compte banni suite à un signalement',
            });
          }

          const updated = await Report.findByIdAndUpdate(
            reportId,
            {
              status: status || report.status,
              adminNotes: adminNotes || report.adminNotes,
              resolvedBy: req.user!.userId,
              resolvedAt: status === 'RESOLU' || status === 'REJETE' ? new Date() : undefined,
            },
            { returnDocument: 'after' },
          );

          return { reportId, success: true, data: updated };
        } catch (err) {
          return { reportId, success: false, error: String(err) };
        }
      }),
    );

    const successCount = results.filter((r) => r.success).length;

    logReportAction('BULK_UPDATE_REPORTS', req.user!.userId, {
      count: reportIds.length,
      successCount,
      status,
      action,
    });

    res.status(200).json({
      success: true,
      message: `${successCount}/${reportIds.length} signalements traités`,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/admin/top-reported
 * Récupère les contenus les plus signalés (admin only)
 */
export const getTopReported = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { type = 'ANNONCE', limit = 10 } = req.query;

    const topReported = await Report.aggregate([
      {
        $match: { type },
      },
      {
        $group: {
          _id: '$targetId',
          reportCount: { $sum: 1 },
          reasons: { $push: '$reason' },
          lastReportedAt: { $max: '$createdAt' },
        },
      },
      {
        $sort: { reportCount: -1 },
      },
      {
        $limit: Number(limit),
      },
    ]);

    logReportAction('GET_TOP_REPORTED', req.user!.userId, {
      type,
      limit: Number(limit),
    });

    res.status(200).json({
      success: true,
      message: 'Contenus les plus signalés',
      data: topReported,
    });
  } catch (error) {
    next(error);
  }
};
