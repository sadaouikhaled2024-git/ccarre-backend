import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import User from '../models/user.model';
import ApiError from '../utils/ApiError';
import { generateToken } from '../utils/jwt';
import { sendConfirmationEmail } from '../utils/email';

/* ────────────────────────────────────────────
   POST /api/auth/register
   ──────────────────────────────────────────── */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Vérifier si un utilisateur avec cet email existe déjà
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      throw new ApiError(409, 'Un compte avec cet email existe déjà');
    }

    // Générer un code de confirmation à 8 chiffres
    const confirmationToken = String(crypto.randomInt(10000000, 99999999));
    const confirmationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Créer l'utilisateur (le hash du mdp est géré par le pre-save hook)
    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password,
      isVerified: false,
      confirmationToken,
      confirmationExpires,
    });

    // Envoyer l'email de confirmation
    await sendConfirmationEmail({
      to: user.email,
      firstName: user.firstName,
      confirmationCode: confirmationToken,
    });

    res.status(201).json({
      success: true,
      message: 'Inscription réussie. Un code de confirmation a été envoyé par email.',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/* ────────────────────────────────────────────
   POST /api/auth/confirm
   ──────────────────────────────────────────── */
export const confirmEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      throw new ApiError(400, 'Email et code de confirmation requis');
    }

    // Trouver l'utilisateur avec cet email et ce code non expiré
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      confirmationToken: code,
      confirmationExpires: { $gt: new Date() },
    }).select('+confirmationToken +confirmationExpires');

    if (!user) {
      throw new ApiError(400, 'Code de confirmation invalide ou expiré');
    }

    // Activer le compte
    user.isVerified = true;
    user.confirmationToken = undefined;
    user.confirmationExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Compte confirmé avec succès. Tu peux maintenant te connecter.',
    });
  } catch (error) {
    next(error);
  }
};

/* ────────────────────────────────────────────
   POST /api/auth/resend-confirmation
   ──────────────────────────────────────────── */
export const resendConfirmation = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ApiError(400, "L'email est requis");
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('+confirmationToken +confirmationExpires');

    if (!user) {
      // Ne pas révéler si l'email existe ou non
      res.status(200).json({
        success: true,
        message: 'Si un compte existe avec cet email, un nouvel email de confirmation a été envoyé.',
      });
      return;
    }

    if (user.isVerified) {
      throw new ApiError(400, 'Ce compte est déjà confirmé');
    }

    // Générer un nouveau code à 8 chiffres
    const confirmationCode = String(crypto.randomInt(10000000, 99999999));
    user.confirmationToken = confirmationCode;
    user.confirmationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    await sendConfirmationEmail({
      to: user.email,
      firstName: user.firstName,
      confirmationCode,
    });

    res.status(200).json({
      success: true,
      message: 'Si un compte existe avec cet email, un nouvel email de confirmation a été envoyé.',
    });
  } catch (error) {
    next(error);
  }
};

/* ────────────────────────────────────────────
   POST /api/auth/login
   ──────────────────────────────────────────── */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Récupérer l'utilisateur avec le mot de passe (select: false par défaut)
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
      '+password',
    );

    if (!user) {
      throw new ApiError(401, 'Email ou mot de passe incorrect');
    }

    // Vérifier le mot de passe
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new ApiError(401, 'Email ou mot de passe incorrect');
    }

    // Vérifier que le compte est confirmé
    if (!user.isVerified) {
      throw new ApiError(403, 'Ton compte n\'est pas encore confirmé. Vérifie tes emails.');
    }

    if (user.isBanned) {
      throw new ApiError(403, 'Ce compte est banni.');
    }

    // Générer le JWT
    const token = generateToken({
      userId: (user._id as unknown as string).toString(),
      email: user.email,
      role: user.role,
    });

    res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user,
        role: user.role,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* ────────────────────────────────────────────
   GET /api/auth/me  (route protégée – test)
   ──────────────────────────────────────────── */
export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findById(req.user?.userId);

    if (!user) {
      throw new ApiError(404, 'Utilisateur introuvable');
    }

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};
/**
 * PATCH /api/auth/change-password
 * Changer le mot de passe
 */
export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(401, 'Utilisateur non authentifié');
    }

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new ApiError(400, 'Tous les champs sont requis');
    }

    if (newPassword !== confirmPassword) {
      throw new ApiError(400, 'Les nouveaux mots de passe ne correspondent pas');
    }

    if (newPassword.length < 8) {
      throw new ApiError(400, 'Le mot de passe doit faire au moins 8 caractères');
    }

    if (newPassword === currentPassword) {
      throw new ApiError(400, 'Le nouveau mot de passe doit être différent du courant');
    }

    // Récupérer l'utilisateur avec le mot de passe
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new ApiError(404, 'Utilisateur introuvable');
    }

    // Vérifier le mot de passe actuel
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Mot de passe actuel incorrect');
    }

    // Mettre à jour le mot de passe
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Mot de passe modifié avec succès',
    });
  } catch (error) {
    next(error);
  }
};