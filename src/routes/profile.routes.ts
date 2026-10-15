import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware';
import upload from '../middlewares/upload.middleware';
import {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  deleteProfilePhoto,
  getPublicProfile,
} from '../controllers/profile.controller';

const router = Router();

/* ────────────────────────────────────────────
   ALL ROUTES REQUIRE AUTHENTICATION
   ──────────────────────────────────────────── */
router.use(authMiddleware);

/**
 * GET /api/profile
 * Get current user's full profile
 * @access Private
 */
router.get('/', getProfile);

/**
 * PUT /api/profile
 * Update profile (firstName, lastName, address, campus)
 * @access Private
 */
router.put('/', updateProfile);

/**
 * POST /api/profile/photo
 * Upload profile photo to Cloudinary
 * @access Private
 */
router.post('/photo', upload.single('file'), uploadProfilePhoto);

/**
 * DELETE /api/profile/photo
 * Delete profile photo
 * @access Private
 */
router.delete('/photo', deleteProfilePhoto);

/**
 * GET /api/profile/public/:userId
 * Get public profile of another user
 * @access Private
 */
router.get('/public/:userId', getPublicProfile);

export default router;
