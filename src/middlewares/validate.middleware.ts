import { Request, Response, NextFunction } from 'express';
import ApiError from '../utils/ApiError';
import { EMAIL_REGEX } from '../utils/constants';

/**
 * Valide les champs requis pour l'inscription.
 */
export const validateRegister = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const { firstName, lastName, email, password } = req.body;

  const errors: string[] = [];

  if (!firstName || typeof firstName !== 'string' || firstName.trim().length < 2) {
    errors.push('Le prénom est requis (minimum 2 caractères)');
  }

  if (!lastName || typeof lastName !== 'string' || lastName.trim().length < 2) {
    errors.push('Le nom est requis (minimum 2 caractères)');
  }

  if (!email || typeof email !== 'string') {
    errors.push("L'email est requis");
  } else if (!EMAIL_REGEX.test(email.trim().toLowerCase())) {
    errors.push('Seules les adresses email @etu.univ-amu.fr sont autorisées');
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    errors.push('Le mot de passe est requis (minimum 8 caractères)');
  }

  if (errors.length > 0) {
    return next(new ApiError(400, errors.join(' | ')));
  }

  next();
};

/**
 * Valide les champs requis pour le login.
 */
export const validateLogin = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const { email, password } = req.body;

  const errors: string[] = [];

  if (!email || typeof email !== 'string') {
    errors.push("L'email est requis");
  }

  if (!password || typeof password !== 'string') {
    errors.push('Le mot de passe est requis');
  }

  if (errors.length > 0) {
    return next(new ApiError(400, errors.join(' | ')));
  }

  next();
};
