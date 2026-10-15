import { Request, Response, NextFunction } from 'express';
import Notification from '../models/notification.model';
import ApiError from '../utils/ApiError';

/* ────────────────────────────────────────────
   GET /api/notifications
   Get all notifications for the current user
   ──────────────────────────────────────────── */
export const getUserNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { unreadOnly } = req.query;

    if (!userId) {
      throw new ApiError(401, 'Utilisateur non authentifié');
    }

    const filter: any = { user: userId };
    if (unreadOnly === 'true') {
      filter.read = false;
    }

    const notifications = await Notification.find(filter)
      .populate('user', 'firstName lastName email')
      .populate('notifiedBy', 'firstName lastName email')
      .populate('relatedEchange')
      .populate('relatedMessage')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

/* ────────────────────────────────────────────
   PUT /api/notifications/:id/read
   Mark a notification as read
   ──────────────────────────────────────────── */
export const markAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(401, 'Utilisateur non authentifié');
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      throw new ApiError(404, 'La notification n\'existe pas');
    }

    // Vérifier que l'utilisateur est propriétaire de la notification
    if (notification.user.toString() !== userId) {
      throw new ApiError(403, 'Vous ne pouvez pas modifier cette notification');
    }

    notification.read = true;
    await notification.save();

    res.status(200).json({
      success: true,
      message: 'Notification marquée comme lue',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

/* ────────────────────────────────────────────
   PUT /api/notifications/read-all
   Mark all notifications as read for the current user
   ──────────────────────────────────────────── */
export const markAllAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(401, 'Utilisateur non authentifié');
    }

    await Notification.updateMany(
      { user: userId, read: false },
      { read: true },
    );

    res.status(200).json({
      success: true,
      message: 'Toutes les notifications ont été marquées comme lues',
    });
  } catch (error) {
    next(error);
  }
};
