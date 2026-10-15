import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware';
import { isAdmin, logAdminAction } from '../middlewares/admin.middleware';
import {
  createReport,
  getMyReports,
  getReportDetail,
} from '../controllers/signalement.controller';
import {
  listReportsForAdmin,
  getReportStats,
  searchReports,
  updateReportStatus,
  resolveReport,
  deleteReport,
  bulkUpdateReports,
  getTopReported,
} from '../controllers/report-resolution.controller';

const router = Router();

/* ────────────────────────────────────
   ROUTES UTILISATEUR (Authentifiées)
   ──────────────────────────────────── */

/* POST /api/reports – Créer un signalement */
router.post('/', authMiddleware, createReport);

/* GET /api/reports – Récupérer ses signalements */
router.get('/', authMiddleware, getMyReports);

/* GET /api/reports/:reportId – Détails d'un signalement */
router.get('/:reportId', authMiddleware, getReportDetail);

/* ────────────────────────────────────
   ROUTES ADMIN (Authentifiées + Admin)
   ──────────────────────────────────── */

/* GET /api/reports/admin/list – Lister tous les signalements */
router.get('/admin/list', authMiddleware, isAdmin, logAdminAction('List all reports'), listReportsForAdmin);

/* GET /api/reports/admin/stats – Statistiques */
router.get('/admin/stats', authMiddleware, isAdmin, logAdminAction('Get report stats'), getReportStats);

/* GET /api/reports/admin/search – Recherche les signalements */
router.get('/admin/search', authMiddleware, isAdmin, logAdminAction('Search reports'), searchReports);

/* GET /api/reports/admin/top-reported – Contenus les plus signalés */
router.get(
  '/admin/top-reported',
  authMiddleware,
  isAdmin,
  logAdminAction('Get top reported'),
  getTopReported,
);

/* PATCH /api/reports/admin/:id/status – Changer le statut */
router.patch(
  '/admin/:id/status',
  authMiddleware,
  isAdmin,
  logAdminAction('Update report status'),
  updateReportStatus,
);

/* PUT /api/reports/admin/:id/resolve – Résoudre un signalement */
router.put(
  '/admin/:id/resolve',
  authMiddleware,
  isAdmin,
  logAdminAction('Resolve report'),
  resolveReport,
);

/* DELETE /api/reports/admin/:id – Supprimer un signalement */
router.delete(
  '/admin/:id',
  authMiddleware,
  isAdmin,
  logAdminAction('Delete report'),
  deleteReport,
);

/* POST /api/reports/admin/bulk-update – Mise à jour en masse */
router.post(
  '/admin/bulk-update',
  authMiddleware,
  isAdmin,
  logAdminAction('Bulk update reports'),
  bulkUpdateReports,
);

export default router;
