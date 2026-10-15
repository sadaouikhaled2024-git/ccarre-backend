import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware';
import { isAdmin, logAdminAction, createRateLimiter, sanitizeInputs } from '../middlewares/admin.middleware';
import {
  getDashboardStats,
  getAnalytics,
  listAnnoncesAdmin as listAnnonces,
  getAnnonceDetail,
  deleteAnnonce,
  hardDeleteAnnonce,
  updateAnnonceRiskScore,
  listUsers,
  banUser,
  unbanUser,
  deleteUser,
  listReports,
  updateReportStatus,
  deleteReport,
  listMessages,
  deleteMessage,
  listBlockedUsers,
  unblockUser,
} from '../controllers/admin.controller';

const router = Router();

/* ───────── Middlewares globaux ───────── */
// Authentification requise pour toutes les routes
router.use(authMiddleware);

// Vérification du rôle admin
router.use(isAdmin);

// Sanitisation des inputs
router.use(sanitizeInputs);

// Rate limiting (100 requêtes par 15 minutes)
router.use(createRateLimiter(100, 15 * 60 * 1000));

/* ═══════════════════════════════════════════════════════════════════════════
    DASHBOARD GLOBAL
═══════════════════════════════════════════════════════════════════════════ */

router.get(
  '/dashboard/stats',
  logAdminAction('Récupération des statistiques du dashboard'),
  getDashboardStats,
);

/* ═══════════════════════════════════════════════════════════════════════════
    GESTION DES ANNONCES
═══════════════════════════════════════════════════════════════════════════ */

router.get(
  '/annonces',
  logAdminAction('Listing des annonces'),
  listAnnonces,
);

router.get(
  '/annonces/:id',
  logAdminAction('Récupération des détails d\'une annonce'),
  getAnnonceDetail,
);

router.delete(
  '/annonces/:id',
  logAdminAction('Suppression d\'une annonce'),
  deleteAnnonce,
);

router.delete(
  '/annonces/:id/hard-delete',
  logAdminAction('Suppression définitive d\'une annonce'),
  hardDeleteAnnonce,
);

router.patch(
  '/annonces/:id/risk-score',
  logAdminAction('Mise à jour du score de risque'),
  updateAnnonceRiskScore,
);

/* ═══════════════════════════════════════════════════════════════════════════
    GESTION DES UTILISATEURS
═══════════════════════════════════════════════════════════════════════════ */

router.get(
  '/users',
  logAdminAction('Listing des utilisateurs'),
  listUsers,
);

router.post(
  '/users/:userId/ban',
  logAdminAction('Bannissement d\'un utilisateur'),
  banUser,
);

router.post(
  '/users/:userId/unban',
  logAdminAction('Débannissement d\'un utilisateur'),
  unbanUser,
);

router.delete(
  '/users/:userId',
  logAdminAction('Suppression d\'un utilisateur'),
  deleteUser,
);

/* ═══════════════════════════════════════════════════════════════════════════
    GESTION DES SIGNALEMENTS
═══════════════════════════════════════════════════════════════════════════ */

router.get(
  '/reports',
  logAdminAction('Listing des signalements'),
  listReports,
);

router.patch(
  '/reports/:reportId',
  logAdminAction('Mise à jour d\'un signalement'),
  updateReportStatus,
);

router.delete(
  '/reports/:reportId',
  logAdminAction('Suppression d\'un signalement'),
  deleteReport,
);

/* ═══════════════════════════════════════════════════════════════════════════
    GESTION DES MESSAGES
═══════════════════════════════════════════════════════════════════════════ */

router.get(
  '/messages',
  logAdminAction('Listing des messages'),
  listMessages,
);

router.delete(
  '/messages/:messageId',
  logAdminAction('Suppression d\'un message'),
  deleteMessage,
);

/* ═══════════════════════════════════════════════════════════════════════════
    GESTION DES BLOCAGES
═══════════════════════════════════════════════════════════════════════════ */

router.get(
  '/blocked-users',
  logAdminAction('Listing des utilisateurs bloqués'),
  listBlockedUsers,
);

router.delete(
  '/blocked-users/:blockId',
  logAdminAction('Déblocage d\'un utilisateur'),
  unblockUser,
);

/* ═══════════════════════════════════════════════════════════════════════════
    ANALYTICS
═══════════════════════════════════════════════════════════════════════════ */

router.get(
  '/analytics',
  logAdminAction('Récupération des analytics'),
  getAnalytics,
);

export default router;
