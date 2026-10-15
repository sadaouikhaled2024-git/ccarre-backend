import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { Types } from 'mongoose';
import { verifyToken } from '../utils/jwt';
import User from '../models/user.model';
import Message from '../models/message.model';
import Notification, { NotificationType } from '../models/notification.model';
import Echange, { EchangeStatus } from '../models/echange.model';
import ApiError from '../utils/ApiError';
import { isBlockedBetween } from '../controllers/block.controller';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  echangeRooms?: Set<string>;
}

let ioInstance: Server | null = null;

export const getIo = (): Server | null => ioInstance;

/* ────────────────────────────────────────────
   Initialize Socket.io server
   ──────────────────────────────────────────── */
export const initializeSocket = (httpServer: HTTPServer): Server => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? 'https://ccarre.fr' : '*',
      credentials: true,
    },
  });

  ioInstance = io;

  /* ────────────────────────────────────────────
     Socket.io Middleware: JWT Authentication
     ──────────────────────────────────────────── */
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      // Try to get token from different sources
      let token = socket.handshake.auth?.token;
      
      // Also check query params as fallback
      if (!token && socket.handshake.query?.token) {
        token = socket.handshake.query.token as string;
      }

      if (!token) {
        console.warn('[Socket.io] No token provided for connection');
        return next(new Error('Authentication error - token missing'));
      }

      // Verify token
      const decoded = verifyToken(token);
      
      if (!decoded || !decoded.userId) {
        console.warn('[Socket.io] Invalid token decoded');
        return next(new Error('Authentication error - invalid token'));
      }

      // Verify user exists
      const user = await User.findById(decoded.userId);
      if (!user) {
        console.warn('[Socket.io] User not found:', decoded.userId);
        return next(new Error('Authentication error - user not found'));
      }

      // Attach userId to socket
      socket.userId = decoded.userId;
      socket.echangeRooms = new Set();

      next();
    } catch (error) {
      console.error('[Socket.io] Authentication error:', error);
      next(new Error('Authentication error - invalid token'));
    }
  });

  /* ────────────────────────────────────────────
     Connection
     ──────────────────────────────────────────── */
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`[Socket.io] User connected: ${socket.userId} (socket: ${socket.id})`);

    // Join user-wide room for notifications
    if (socket.userId) {
      const userRoom = `user_${socket.userId}`;
      socket.join(userRoom);
    }

    /* ────────────────────────────────────────────
       join_echange event
       User joins a specific exchange room
       ──────────────────────────────────────────── */
    socket.on('join_echange', async (data: { echangeId: string }, callback?: (err?: Error) => void) => {
      try {
        const { echangeId } = data;
        const userId = socket.userId;

        if (!echangeId) {
          const error = new Error('Exchange ID is required');
          return callback?.(error);
        }

        // Verify exchange exists
        const echange = await Echange.findById(echangeId);
        if (!echange) {
          const error = new Error('Exchange not found');
          return callback?.(error);
        }

        // Verify user is involved in the exchange
        const isInvolved =
          echange.utilisateurDemandeur.toString() === userId ||
          echange.utilisateurProprietaire.toString() === userId;

        if (!isInvolved) {
          const error = new Error('Not authorized to join this exchange');
          return callback?.(error);
        }

        // Join room
        const roomId = `echange_${echangeId}`;
        socket.join(roomId);
        socket.echangeRooms?.add(roomId);

        console.log(`[Socket.io] User ${userId} joined exchange ${echangeId}`);

        // Notify other users in the room
        socket.to(roomId).emit('user_joined', {
          userId,
          echangeId,
          message: `Utilisateur connecté`,
        });

        callback?.();
      } catch (error) {
        console.error('[Socket.io] Error joining exchange:', error);
        callback?.(error as Error);
      }
    });

    /* ────────────────────────────────────────────
       send_message event
       User sends a message in real-time
       ──────────────────────────────────────────── */
    socket.on(
      'send_message',
      async (data: { echangeId: string; contenu: string }, callback?: (err?: Error, messageId?: string) => void) => {
        try {
          const { echangeId, contenu } = data;
          const userId = socket.userId;

          if (!echangeId || !contenu) {
            const error = new Error('Exchange ID and content are required');
            return callback?.(error);
          }

          // Verify exchange exists
          const echange = await Echange.findById(echangeId);
          if (!echange) {
            const error = new Error('Exchange not found');
            return callback?.(error);
          }

          // Verify user is involved
          const isInvolved =
            echange.utilisateurDemandeur.toString() === userId ||
            echange.utilisateurProprietaire.toString() === userId;

          if (!isInvolved) {
            const error = new Error('Not authorized to send messages in this exchange');
            return callback?.(error);
          }

          // Check exchange status - messaging only allowed when ACCEPTE or TERMINE (read-only)
          if (echange.statut === EchangeStatus.EN_ATTENTE) {
            const error = new Error('Messages can only be sent when the exchange is accepted');
            return callback?.(error);
          }

          if (echange.statut === EchangeStatus.REFUSE) {
            const error = new Error('Cannot send messages in a refused exchange');
            return callback?.(error);
          }

          if (echange.statut === EchangeStatus.ANNULE) {
            const error = new Error('Cannot send messages in a cancelled exchange');
            return callback?.(error);
          }

          const otherUserId =
            echange.utilisateurDemandeur.toString() === userId
              ? echange.utilisateurProprietaire.toString()
              : echange.utilisateurDemandeur.toString();

          if (await isBlockedBetween(userId!, otherUserId)) {
            const error = new Error('Messaging is blocked between these users');
            return callback?.(error);
          }

          // Save message to database
          const message = await Message.create({
            echangeId,
            expediteur: userId,
            contenu,
          });

          const populatedMessage = await message.populate('expediteur');

          // Emit message to all users in the room
          const roomId = `echange_${echangeId}`;
          io.to(roomId).emit('receive_message', {
            _id: message._id,
            echangeId,
            expediteur: populatedMessage.expediteur,
            contenu,
            createdAt: message.createdAt,
          });

          // Create notification for the other user
          await Notification.create({
            user: otherUserId,
            notifiedBy: new Types.ObjectId(userId),
            type: NotificationType.MESSAGE,
            contenu: `Nouveau message reçu`,
            relatedEchange: echangeId,
            relatedMessage: message._id,
          });

          // Emit notification event to the other user
          io.to(`user_${otherUserId}`).emit('notification', {
            type: NotificationType.MESSAGE,
            contenu: `Nouveau message reçu`,
            echangeId,
          });

          callback?.(undefined, message._id.toString());
        } catch (error) {
          console.error('[Socket.io] Error sending message:', error);
          callback?.(error as Error);
        }
      },
    );

    /* ────────────────────────────────────────────
       leave_echange event
       User leaves an exchange room
       ──────────────────────────────────────────── */
    socket.on('leave_echange', (data: { echangeId: string }) => {
      try {
        const { echangeId } = data;
        const userId = socket.userId;
        const roomId = `echange_${echangeId}`;

        socket.leave(roomId);
        socket.echangeRooms?.delete(roomId);

        console.log(`[Socket.io] User ${userId} left exchange ${echangeId}`);

        // Notify other users in the room
        socket.to(roomId).emit('user_left', {
          userId,
          echangeId,
          message: `Utilisateur déconnecté`,
        });
      } catch (error) {
        console.error('[Socket.io] Error leaving exchange:', error);
      }
    });

    /* ────────────────────────────────────────────
       Disconnect
       ──────────────────────────────────────────── */
    socket.on('disconnect', () => {
      const userId = socket.userId;
      console.log(`[Socket.io] User disconnected: ${userId} (socket: ${socket.id})`);

      // Leave all exchange rooms
      socket.echangeRooms?.forEach((roomId) => {
        socket.to(roomId).emit('user_left', {
          userId,
          message: `Utilisateur déconnecté`,
        });
      });
    });
  });

  return io;
};

export default initializeSocket;
