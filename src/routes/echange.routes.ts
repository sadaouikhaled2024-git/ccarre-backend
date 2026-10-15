import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware';
import {
  createEchange,
  getUserEchanges,
  acceptEchange,
  refuseEchange,
  completeEchange,
  cancelEchange,
  getExchangeHistory,
} from '../controllers/echange.controller';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

/**
 * POST /api/echanges
 * Create a new exchange request
 */
router.post('/', createEchange);

/**
 * GET /api/echanges
 * Get all exchanges for the current user
 */
router.get('/', getUserEchanges);

/**
 * GET /api/echanges/history
 * Get exchange history (ongoing and completed)
 */
router.get('/history', getExchangeHistory);

/**
 * PUT /api/echanges/:id/accept
 * Accept an exchange request
 */
router.put('/:id/accept', acceptEchange);

/**
 * PUT /api/echanges/:id/refuse
 * Refuse an exchange request
 */
router.put('/:id/refuse', refuseEchange);

/**
 * PUT /api/echanges/:id/complete
 * Complete an exchange
 */
router.put('/:id/complete', completeEchange);

/**
 * PUT /api/echanges/:id/cancel
 * Cancel an exchange
 */
router.put('/:id/cancel', cancelEchange);

export default router;
