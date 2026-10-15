import dotenv from 'dotenv';
// Charger les variables d'environnement AVANT tout import qui les utilise
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import connectDB from './config/db';
import initializeSocket from './config/socket';
import routes from './routes';
import errorMiddleware from './middlewares/error.middleware';

/* ────────── App Express ────────── */

const app = express();
const httpServer = createServer(app);

/* ── Middlewares globaux ── */

// Sécurité HTTP headers
app.use(helmet());

// CORS (à restreindre en production)
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' ? 'https://ccarre.fr' : '*',
    credentials: true,
  }),
);

// Logger HTTP
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Body parsers
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

/* ── Health check ── */

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'CCarré API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

/* ── Routes API ── */

app.use('/api', routes);

/* ── 404 – Route non trouvée ── */

app.all('{*path}', (_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route introuvable',
  });
});

/* ── Middleware d'erreur centralisé ── */

app.use(errorMiddleware);

/* ────────── WebSocket – Socket.io ────────── */

initializeSocket(httpServer);

/* ────────── Démarrage du serveur ────────── */

const PORT = parseInt(process.env.PORT || '5000', 10);

const startServer = async (): Promise<void> => {
  await connectDB();

  httpServer.listen(PORT, () => {
    console.log(`\n[OK] CCarré API démarrée sur http://localhost:${PORT}`);
    console.log(`[INFO] Environnement : ${process.env.NODE_ENV || 'development'}`);
    console.log(`[INFO] WebSocket disponible sur ws://localhost:${PORT}\n`);
  });
};

startServer().catch((err) => {
  console.error('[ERROR] Failed to start server:', err);
  process.exit(1);
});

export default app;
