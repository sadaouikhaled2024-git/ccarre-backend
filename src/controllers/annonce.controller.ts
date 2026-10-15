import { Request, Response, NextFunction } from 'express';
import Annonce, { AnnonceType } from '../models/annonce.model';
import ApiError from '../utils/ApiError';
import { uploadImageToCloudinary } from '../config/cloudinary';

const parseImagesInput = (value: unknown): string[] => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string');
      }
    } catch {
      return [value];
    }
  }

  return [];
};

const uploadFilesFromRequest = async (req: Request): Promise<string[]> => {
  const files = req.files || [];
  if (!Array.isArray(files) || files.length === 0) return [];

  const uploadedUrls = await Promise.all(
    files.map((file) => uploadImageToCloudinary(file.buffer)),
  );

  return uploadedUrls;
};

/* ────────────────────────────────────────────
   POST /api/annonces  –  Créer une annonce
   ──────────────────────────────────────────── */
export const createAnnonce = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { title, description, type, category, price, exchangeFor, borrowPeriod } = req.body;

    // Validation du type
    if (!title || !description || !type) {
      throw new ApiError(400, 'Le titre, la description et le type sont obligatoires');
    }

    if (!Object.values(AnnonceType).includes(type)) {
      throw new ApiError(400, 'Le type doit être : vente, echange, pret ou demandePret');
    }

    // Validation des champs conditionnels selon le type
    if (type === AnnonceType.VENTE) {
      if (!price || price <= 0) {
        throw new ApiError(400, 'Un prix valide (> 0) est requis pour une annonce de vente');
      }
    }

    if (type === AnnonceType.ECHANGE) {
      if (!exchangeFor || exchangeFor.trim().length === 0) {
        throw new ApiError(400, 'Veuillez décrire ce que vous recherchez en échange');
      }
    }

    if (type === AnnonceType.PRET) {
      if (!borrowPeriod || borrowPeriod.trim().length === 0) {
        throw new ApiError(400, 'Veuillez spécifier la période de prêt (ex: "2 semaines", "1 mois")');
      }
    }

    const bodyImages = parseImagesInput(req.body.images);
    const uploadedImages = await uploadFilesFromRequest(req);
    const finalImages = [...bodyImages, ...uploadedImages];

    // Handle exchange image separately (single file for exchange item picture)
    let exchangeImage = req.body.exchangeImage;
    if (type === AnnonceType.ECHANGE && req.files && Array.isArray(req.files) && req.files.length > 0) {
      // If there's an exchangeImage field in body, use it; otherwise use first uploaded file for exchange
      const exchangeImageFile = req.files.find((f: any) => f.fieldname === 'exchangeImage');
      if (exchangeImageFile) {
        exchangeImage = await uploadImageToCloudinary(exchangeImageFile.buffer);
      }
    }

    const annonceData: any = {
      title,
      description,
      type,
      category,
      images: finalImages,
      owner: req.user!.userId,
    };

    // Add conditional fields
    if (type === AnnonceType.VENTE) {
      annonceData.price = price;
    }
    if (type === AnnonceType.ECHANGE) {
      annonceData.exchangeFor = exchangeFor;
      annonceData.exchangeImage = exchangeImage;
    }
    if (type === AnnonceType.PRET) {
      annonceData.borrowPeriod = borrowPeriod;
    }

    const annonce = await Annonce.create(annonceData);

    await annonce.populate('owner', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Annonce créée avec succès',
      data: { annonce },
    });
  } catch (error) {
    next(error);
  }
};

/* ────────────────────────────────────────────
   GET /api/annonces  –  Récupérer toutes les annonces
   ──────────────────────────────────────────── */
export const getAnnonces = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Filtres optionnels via query params
    const { type, category, status, mine, ownerId, q, minPrice, maxPrice, sortBy, page = '1', pageSize = '20' } = req.query;
    const filter: Record<string, any> = {};

    if (type) filter.type = type;
    if (category) filter.category = category;
    if (status) filter.status = status;

    if (minPrice) {
      filter.price = { ...(filter.price || {}), $gte: Number(minPrice) };
    }
    if (maxPrice) {
      filter.price = { ...(filter.price || {}), $lte: Number(maxPrice) };
    }

    if (q && typeof q === 'string' && q.trim().length > 0) {
      filter.$text = { $search: q.trim() };
    }

    // Autoriser le filtrage des annonces de l'utilisateur courant ou d'un owner explicite
    if (mine === 'true' && req.user?.userId) {
      filter.owner = req.user.userId;
    } else if (ownerId) {
      filter.owner = ownerId;
    }

    const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
    const sizeNum = Math.min(Math.max(parseInt(pageSize as string, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * sizeNum;

    let sort: Record<string, 1 | -1> = { createdAt: -1 };
    if (sortBy === 'price_asc') sort = { price: 1 } as any;
    if (sortBy === 'price_desc') sort = { price: -1 } as any;
    if (sortBy === 'recent') sort = { createdAt: -1 };

    const [annonces, total] = await Promise.all([
      Annonce.find(filter)
        .populate('owner', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(sizeNum),
      Annonce.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: annonces.length,
      total,
      page: pageNum,
      pageSize: sizeNum,
      data: { annonces },
    });
  } catch (error) {
    next(error);
  }
};

/* ────────────────────────────────────────────
   GET /api/annonces/:id  –  Récupérer une annonce par ID
   ──────────────────────────────────────────── */
export const getAnnonceById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const annonce = await Annonce.findById(req.params.id)
      .populate('owner', 'firstName lastName email');

    if (!annonce) {
      throw new ApiError(404, 'Annonce introuvable');
    }

    res.status(200).json({
      success: true,
      data: { annonce },
    });
  } catch (error) {
    next(error);
  }
};

/* ────────────────────────────────────────────
   PUT /api/annonces/:id  –  Modifier une annonce
   ──────────────────────────────────────────── */
export const updateAnnonce = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { title, description, type, category, status, price, exchangeFor, borrowPeriod } = req.body;

    // Valider le type s'il est fourni
    if (type && !Object.values(AnnonceType).includes(type)) {
      throw new ApiError(400, 'Le type doit être : vente, echange, pret ou demandePret');
    }

    const existing = await Annonce.findById(req.params.id);
    if (!existing) {
      throw new ApiError(404, 'Annonce introuvable');
    }
    if (existing.owner.toString() !== req.user!.userId) {
      throw new ApiError(403, "Tu n'es pas autorisé à modifier cette annonce");
    }

    // Validation des champs conditionnels selon le type (si type est fourni ou existant)
    const finalType = type || existing.type;

    if (finalType === AnnonceType.VENTE && price !== undefined) {
      if (price <= 0) {
        throw new ApiError(400, 'Un prix valide (> 0) est requis pour une annonce de vente');
      }
    }

    if (finalType === AnnonceType.ECHANGE && exchangeFor !== undefined) {
      if (exchangeFor.trim().length === 0) {
        throw new ApiError(400, 'Veuillez décrire ce que vous recherchez en échange');
      }
    }

    if (finalType === AnnonceType.PRET && borrowPeriod !== undefined) {
      if (borrowPeriod.trim().length === 0) {
        throw new ApiError(400, 'Veuillez spécifier la période de prêt');
      }
    }

    const bodyImages = parseImagesInput(req.body.images);
    const uploadedImages = await uploadFilesFromRequest(req);

    let finalImages = existing.images;
    if (bodyImages.length > 0 || uploadedImages.length > 0) {
      finalImages = [...bodyImages, ...uploadedImages];
    }

    // Handle exchange image separately
    let exchangeImage = req.body.exchangeImage || existing.exchangeImage;
    if (finalType === AnnonceType.ECHANGE && req.files && Array.isArray(req.files) && req.files.length > 0) {
      const exchangeImageFile = req.files.find((f: any) => f.fieldname === 'exchangeImage');
      if (exchangeImageFile) {
        exchangeImage = await uploadImageToCloudinary(exchangeImageFile.buffer);
      }
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (category !== undefined) updateData.category = category;
    if (status !== undefined) updateData.status = status;
    if (bodyImages.length > 0 || uploadedImages.length > 0) updateData.images = finalImages;
    if (price !== undefined) updateData.price = price;
    if (exchangeFor !== undefined) updateData.exchangeFor = exchangeFor;
    if (exchangeImage !== undefined) updateData.exchangeImage = exchangeImage;
    if (borrowPeriod !== undefined) updateData.borrowPeriod = borrowPeriod;

    const annonce = await Annonce.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true },
    ).populate('owner', 'firstName lastName email');

    res.status(200).json({
      success: true,
      message: 'Annonce modifiée avec succès',
      data: { annonce },
    });
  } catch (error) {
    next(error);
  }
};

/* ────────────────────────────────────────────
   DELETE /api/annonces/:id  –  Supprimer une annonce
   ──────────────────────────────────────────── */
export const deleteAnnonce = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const annonce = await Annonce.findById(req.params.id);
    if (!annonce) {
      throw new ApiError(404, 'Annonce introuvable');
    }
    if (annonce.owner.toString() !== req.user!.userId) {
      throw new ApiError(403, "Tu n'es pas autorisé à supprimer cette annonce");
    }

    await Annonce.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Annonce supprimée avec succès',
    });
  } catch (error) {
    next(error);
  }
};
