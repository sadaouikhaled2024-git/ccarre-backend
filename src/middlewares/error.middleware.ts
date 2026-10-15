import { Request, Response, NextFunction } from 'express';
import ApiError from '../utils/ApiError';
import mongoose from 'mongoose';

/**
 * Middleware global de gestion des erreurs.
 * Doit être enregistré en dernier dans la chaîne Express.
 */
const errorMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  /* ── ApiError connue ── */
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  /* ── Erreur de validation Mongoose ── */
  if (err instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(err.errors).map((e) => e.message);
    res.status(400).json({
      success: false,
      message: 'Erreur de validation',
      errors: messages,
    });
    return;
  }

  /* ── Duplicate key (code 11000) ── */
  if ((err as any).code === 11000) {
    const field = Object.keys((err as any).keyPattern || {})[0] || 'champ';
    res.status(409).json({
      success: false,
      message: `La valeur du champ « ${field} » est déjà utilisée`,
    });
    return;
  }

  /* ── CastError (ObjectId invalide) ── */
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({
      success: false,
      message: `Identifiant invalide : ${err.value}`,
    });
    return;
  }

  /* ── Erreur JWT (via jsonwebtoken) ── */
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      message: 'Token invalide',
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      message: 'Token expiré',
    });
    return;
  }

  /* ── Erreur générique / non prévue ── */
  console.error('[ERROR] Unhandled error:', err);

  res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production'
        ? 'Erreur interne du serveur'
        : err.message || 'Erreur interne du serveur',
  });
};

export default errorMiddleware;
