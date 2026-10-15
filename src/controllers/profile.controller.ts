import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import User from '../models/user.model';
import ApiError from '../utils/ApiError';
import { uploadImageToCloudinary } from '../config/cloudinary';

/* ────────────────────────────────────────────
   GET /api/profile
   Get current user's full profile
   ──────────────────────────────────────────── */
export const getProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(401, 'Utilisateur non authentifié');
    }

    const user = await User.findById(userId).select('-password -confirmationToken -confirmationExpires');

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

/* ────────────────────────────────────────────
   PUT /api/profile
   Update profile (firstName, lastName, address, campus)
   ──────────────────────────────────────────── */
export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { firstName, lastName, address, campus } = req.body;

    if (!userId) {
      throw new ApiError(401, 'Utilisateur non authentifié');
    }

    const updateData: any = {};

    if (firstName !== undefined) {
      if (typeof firstName !== 'string' || firstName.trim().length < 2) {
        throw new ApiError(400, 'Le prénom doit faire au moins 2 caractères');
      }
      updateData.firstName = firstName.trim();
    }

    if (lastName !== undefined) {
      if (typeof lastName !== 'string' || lastName.trim().length < 2) {
        throw new ApiError(400, 'Le nom doit faire au moins 2 caractères');
      }
      updateData.lastName = lastName.trim();
    }

    if (address !== undefined) {
      if (typeof address !== 'string') {
        throw new ApiError(400, "L'adresse doit être une chaîne");
      }
      updateData.address = address.trim();
    }

    if (campus !== undefined) {
      if (typeof campus !== 'string' || campus.trim().length === 0) {
        throw new ApiError(400, 'Le campus doit être une chaîne non vide');
      }
      updateData.campus = campus.trim();
    }

    if (Object.keys(updateData).length === 0) {
      throw new ApiError(400, 'Aucune donnée à mettre à jour');
    }

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select('-password -confirmationToken -confirmationExpires');

    res.status(200).json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/* ────────────────────────────────────────────
   POST /api/profile/photo
   Upload profile photo to Cloudinary
   ──────────────────────────────────────────── */
export const uploadProfilePhoto = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const file = (req as any).file as Express.Multer.File | undefined;

    if (!userId) {
      throw new ApiError(401, 'Utilisateur non authentifié');
    }

    if (!file) {
      throw new ApiError(400, 'Aucune image fournie');
    }

    const photoUrl = await uploadImageToCloudinary(file.buffer);

    const user = await User.findByIdAndUpdate(
      userId,
      { profilePhoto: photoUrl },
      { new: true },
    ).select('-password -confirmationToken -confirmationExpires');

    res.status(200).json({
      success: true,
      message: 'Photo de profil mise à jour avec succès',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/* ────────────────────────────────────────────
   DELETE /api/profile/photo
   Delete profile photo
   ──────────────────────────────────────────── */
export const deleteProfilePhoto = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(401, 'Utilisateur non authentifié');
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { profilePhoto: undefined },
      { new: true },
    ).select('-password -confirmationToken -confirmationExpires');

    res.status(200).json({
      success: true,
      message: 'Photo de profil supprimée avec succès',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/* ────────────────────────────────────────────
   GET /api/profile/public/:userId
   Get public profile of another user
   ──────────────────────────────────────────── */
export const getPublicProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select(
      'firstName lastName email profilePhoto campus address riskScore reportCount createdAt',
    );

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
