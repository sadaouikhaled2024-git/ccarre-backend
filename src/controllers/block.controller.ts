import { Request, Response, NextFunction } from 'express';
import Block from '../models/block.model';
import User from '../models/user.model';
import ApiError from '../utils/ApiError';

export const blockUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const blockerId = req.user?.userId;
    const { userId: targetId } = req.params;

    if (!blockerId) {
      throw new ApiError(401, 'Utilisateur non authentifié');
    }

    if (!targetId) {
      throw new ApiError(400, "L'utilisateur à bloquer est requis");
    }

    if (blockerId === targetId) {
      throw new ApiError(400, 'Impossible de se bloquer soi-même');
    }

    const targetUser = await User.findById(targetId);
    if (!targetUser) {
      throw new ApiError(404, 'Utilisateur introuvable');
    }

    const existing = await Block.findOne({ blocker: blockerId, blocked: targetId });
    if (existing) {
      res.status(200).json({ success: true, message: 'Utilisateur déjà bloqué' });
      return;
    }

    await Block.create({ blocker: blockerId, blocked: targetId });

    res.status(201).json({ success: true, message: 'Utilisateur bloqué' });
  } catch (error) {
    next(error);
  }
};

export const unblockUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const blockerId = req.user?.userId;
    const { userId: targetId } = req.params;

    if (!blockerId) {
      throw new ApiError(401, 'Utilisateur non authentifié');
    }

    if (!targetId) {
      throw new ApiError(400, "L'utilisateur à débloquer est requis");
    }

    await Block.deleteOne({ blocker: blockerId, blocked: targetId });

    res.status(200).json({ success: true, message: 'Utilisateur débloqué' });
  } catch (error) {
    next(error);
  }
};

export const getBlockedUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const blockerId = req.user?.userId;

    if (!blockerId) {
      throw new ApiError(401, 'Utilisateur non authentifié');
    }

    const blocks = await Block.find({ blocker: blockerId }).populate('blocked');

    res.status(200).json({ success: true, data: blocks });
  } catch (error) {
    next(error);
  }
};

export const isBlockedBetween = async (userA: string, userB: string): Promise<boolean> => {
  const existing = await Block.findOne({
    $or: [
      { blocker: userA, blocked: userB },
      { blocker: userB, blocked: userA },
    ],
  });
  return !!existing;
};
