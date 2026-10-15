import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import User from '../models/user.model';
import Annonce from '../models/annonce.model';
import ApiError from '../utils/ApiError';

/* ────────────────────────────────────────────
   POST /api/favorites/:annonceId
   Add an annonce to favorites
   ──────────────────────────────────────────── */
export const addFavorite = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    let { annonceId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(401, 'Utilisateur non authentifié');
    }

    // Handle case where annonceId might be an array
    if (Array.isArray(annonceId)) {
      annonceId = annonceId[0];
    }

    if (!annonceId) {
      throw new ApiError(400, "L'ID de l'annonce est requis");
    }

    // Vérifier que l'annonce existe
    const annonce = await Annonce.findById(annonceId);
    if (!annonce) {
      throw new ApiError(404, "L'annonce n'existe pas");
    }

    // Récupérer l'utilisateur
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'Utilisateur introuvable');
    }

    // Convert annonceId to ObjectId for comparison
    const annonceObjectId = new Types.ObjectId(annonceId as string);

    // Vérifier que l'annonce n'est pas déjà en favori
    const isFavorited = user.favorites.some((fav) => fav.equals(annonceObjectId));
    if (isFavorited) {
      throw new ApiError(400, 'Cette annonce est déjà en favori');
    }

    // Ajouter aux favoris
    user.favorites.push(annonceObjectId);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Annonce ajoutée aux favoris',
      data: user.favorites,
    });
  } catch (error) {
    next(error);
  }
};

/* ────────────────────────────────────────────
   DELETE /api/favorites/:annonceId
   Remove an annonce from favorites
   ──────────────────────────────────────────── */
export const removeFavorite = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    let { annonceId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(401, 'Utilisateur non authentifié');
    }

    // Handle case where annonceId might be an array
    if (Array.isArray(annonceId)) {
      annonceId = annonceId[0];
    }

    if (!annonceId) {
      throw new ApiError(400, "L'ID de l'annonce est requis");
    }

    // Récupérer l'utilisateur
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'Utilisateur introuvable');
    }

    // Convert annonceId to ObjectId for comparison
    const annonceObjectId = new Types.ObjectId(annonceId as string);

    // Vérifier que l'annonce est en favori
    const isFavorited = user.favorites.some((fav) => fav.equals(annonceObjectId));
    if (!isFavorited) {
      throw new ApiError(400, "Cette annonce n'est pas en favori");
    }

    // Retirer des favoris
    user.favorites = user.favorites.filter((id) => !id.equals(annonceObjectId));
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Annonce retirée des favoris',
      data: user.favorites,
    });
  } catch (error) {
    next(error);
  }
};

/* ────────────────────────────────────────────
   GET /api/favorites
   Get all favorite annonces for the current user
   ──────────────────────────────────────────── */
export const getFavorites = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(401, 'Utilisateur non authentifié');
    }

    const user = await User.findById(userId).populate('favorites');
    if (!user) {
      throw new ApiError(404, 'Utilisateur introuvable');
    }

    res.status(200).json({
      success: true,
      data: user.favorites,
    });
  } catch (error) {
    next(error);
  }
};
