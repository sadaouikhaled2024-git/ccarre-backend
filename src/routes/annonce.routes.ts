import { Router } from 'express';
import {
  createAnnonce,
  getAnnonces,
  getAnnonceById,
  updateAnnonce,
  deleteAnnonce,
} from '../controllers/annonce.controller';
import authMiddleware from '../middlewares/auth.middleware';
import upload from '../middlewares/upload.middleware';

const router = Router();

/**
 * @route   POST /api/annonces
 * @desc    Créer une annonce
 * @access  Private
 */
router.post('/', authMiddleware, upload.array('images', 6), createAnnonce);

/**
 * @route   GET /api/annonces
 * @desc    Récupérer toutes les annonces (filtres optionnels via query)
 * @access  Private
 */
router.get('/', authMiddleware, getAnnonces);

/**
 * @route   GET /api/annonces/:id
 * @desc    Récupérer une annonce par son ID
 * @access  Public
 */
router.get('/:id', getAnnonceById);

/**
 * @route   PUT /api/annonces/:id
 * @desc    Modifier une annonce (propriétaire uniquement)
 * @access  Private + Owner
 */
router.put('/:id', authMiddleware, upload.array('images', 6), updateAnnonce);

/**
 * @route   DELETE /api/annonces/:id
 * @desc    Supprimer une annonce (propriétaire uniquement)
 * @access  Private + Owner
 */
router.delete('/:id', authMiddleware, deleteAnnonce);

export default router;
