import { Router } from 'express';
import { register, login, getMe, confirmEmail, resendConfirmation, changePassword } from '../controllers/auth.controller';
import { validateRegister, validateLogin } from '../middlewares/validate.middleware';
import authMiddleware from '../middlewares/auth.middleware';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Inscription d'un nouvel utilisateur (@etu.univ-amu.fr uniquement)
 * @access  Public
 */
router.post('/register', validateRegister, register);

/**
 * @route   POST /api/auth/confirm
 * @desc    Confirmation de l'adresse email via code à 8 chiffres
 * @access  Public
 */
router.post('/confirm', confirmEmail);

/**
 * @route   POST /api/auth/resend-confirmation
 * @desc    Renvoi de l'email de confirmation
 * @access  Public
 */
router.post('/resend-confirmation', resendConfirmation);

/**
 * @route   POST /api/auth/login
 * @desc    Connexion d'un utilisateur existant (compte confirmé requis)
 * @access  Public
 */
router.post('/login', validateLogin, login);

/**
 * @route   GET /api/auth/me
 * @desc    Récupérer le profil de l'utilisateur connecté (route protégée)
 * @access  Private
 */
router.get('/me', authMiddleware, getMe);

/**
 * @route   PATCH /api/auth/change-password
 * @desc    Changer le mot de passe (route protégée)
 * @access  Private
 */
router.patch('/change-password', authMiddleware, changePassword);

export default router;