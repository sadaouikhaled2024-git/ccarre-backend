import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware';
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
} from '../controllers/notification.controller';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

/**
 * GET /api/notifications
 * Get all notifications for the current user
 */
router.get('/', getUserNotifications);

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put('/read-all', markAllAsRead);

/**
 * PUT /api/notifications/:id/read
 * Mark a notification as read
 */
router.put('/:id/read', markAsRead);

export default router;
