import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware';
import {
  addFavorite,
  removeFavorite,
  getFavorites,
} from '../controllers/favorite.controller';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

/**
 * GET /api/favorites
 * Get all favorite annonces for the current user
 */
router.get('/', getFavorites);

/**
 * POST /api/favorites/:annonceId
 * Add an annonce to favorites
 */
router.post('/:annonceId', addFavorite);

/**
 * DELETE /api/favorites/:annonceId
 * Remove an annonce from favorites
 */
router.delete('/:annonceId', removeFavorite);

export default router;
