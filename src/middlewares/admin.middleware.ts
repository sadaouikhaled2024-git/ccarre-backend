import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { UserRole } from '../models/user.model';
import ApiError from '../utils/ApiError';

/**
 * Middleware pour vérifier que l'utilisateur est admin
 */
export const isAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  try {
    if (!req.user) {
      return next(new ApiError(401, 'Non authentifié'));
    }

    if (req.user.role !== UserRole.ADMIN) {
      return next(new ApiError(403, 'Accès réservé aux administrateurs'));
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware pour logger les actions admin
 */
export const logAdminAction = (
  actionDescription: string,
) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Log l'action admin avec timestamp et user ID
    const adminId = req.user?.userId;
    const timestamp = new Date().toISOString();
    const method = req.method;
    const path = req.path;

    console.log(
      `[ADMIN ACTION] ${timestamp} - Admin: ${adminId} | ${method} ${path} | ${actionDescription}`,
    );

    next();
  };
};

/**
 * Middleware pour rate limiting anti-spam
 */
export const createRateLimiter = (maxRequests: number, windowMs: number) => {
  const store = new Map<
    string,
    { count: number; resetTime: number }
  >();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const userStore = store.get(key) || { count: 0, resetTime: now + windowMs };

    if (now > userStore.resetTime) {
      userStore.count = 0;
      userStore.resetTime = now + windowMs;
    }

    userStore.count++;
    store.set(key, userStore);

    // Header de rate limit
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - userStore.count));

    if (userStore.count > maxRequests) {
      return res
        .status(429)
        .json({ success: false, message: 'Trop de requêtes. Réessayez plus tard.' });
    }

    next();
  };
};

/**
 * Middleware de sanitisation pour éviter les injections XSS
 */
export const sanitizeInputs = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach((key) => {
      if (typeof req.body[key] === 'string') {
        // Enlever les balises HTML
        req.body[key] = req.body[key]
          .replace(/<script[^>]*>.*?<\/script>/gi, '')
          .replace(/<[^>]+>/g, '')
          .trim();
      }
    });
  }

  next();
};
