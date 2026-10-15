import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware';
import {
  createMessage,
  getMessages,
  deleteMessage,
  blockUser,
  unblockUser,
  getBlockedUsers,
} from '../controllers/secure-message.controller';

const router = Router();

/* ───────── Middlewares ───────── */
router.use(authMiddleware);

/* ── Messages ── */
router.post('/', createMessage);
router.get('/:echangeId', getMessages);
router.delete('/:messageId', deleteMessage);

/* ── Blocages ── */
router.post('/block/:targetUserId', blockUser);
router.delete('/block/:blockId', unblockUser);
router.get('/blocks/list', getBlockedUsers);

export default router;
