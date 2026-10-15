import mongoose from 'mongoose';

/**
 * Connexion à la base de données MongoDB.
 * Retente automatiquement en cas d'échec grâce aux options Mongoose.
 */
const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI; // Sur le variable d'environnement MONGODB_URI, j'ai changé l'adresse pour un ip de mongodb atlas (je ne peux pas mettre l'adresse de mon cluster ici pour des raisons de sécurité, mais c'est juste pour adresser)

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: true,
    });

    console.log(`[OK] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error('[ERROR] MongoDB connection error:', error);
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    console.error('[ERROR] MongoDB runtime error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[WARN] MongoDB disconnected');
  });
};

export default connectDB;
