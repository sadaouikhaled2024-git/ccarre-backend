import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware';
import upload from '../middlewares/upload.middleware';
import { sendMessage, getMessagesByEchange, uploadMessageImage } from '../controllers/message.controller';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

/**
 * POST /api/messages
 * Send a message in an exchange
 */
router.post('/', sendMessage);

/**
 * POST /api/messages/upload-image
 * Upload an image to Cloudinary for messaging
 */
router.post('/upload-image', upload.single('image'), uploadMessageImage);

/**
 * GET /api/messages/:echangeId
 * Get all messages for an exchange
 */
router.get('/:echangeId', getMessagesByEchange);

export default router;
