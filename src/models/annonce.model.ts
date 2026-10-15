import mongoose, { Document, Schema, Types } from 'mongoose';

/* ───────── Types ───────── */

export enum AnnonceType {
  VENTE = 'vente',
  ECHANGE = 'echange',
  PRET = 'pret',
  DEMANDE_PRET = 'demandePret',
}

export enum AnnonceStatus {
  DISPONIBLE = 'disponible',
  RESERVE = 'reserve',
}

/* ───────── Interface ───────── */

export interface IAnnonce extends Document {
  title: string;
  description: string;
  type: AnnonceType;
  category?: string;
  status: AnnonceStatus;
  images: string[];
  price?: number; // Required if type is 'vente'
  exchangeFor?: string; // Required if type is 'echange'
  exchangeImage?: string; // Image of the item being exchanged for
  borrowPeriod?: string; // Required if type is 'pret' (e.g., "2 semaines", "1 mois")
  owner: Types.ObjectId;
  riskScore?: number; // Risk score for content moderation
  isSuspicious?: boolean; // Whether the annonce is suspicious
  suspiciousReasons?: string[]; // Reasons why the annonce is suspicious
  reportCount?: number; // Number of reports for this annonce
  createdAt: Date;
  updatedAt: Date;
}

/* ───────── Schéma ───────── */

const annonceSchema = new Schema<IAnnonce>(
  {
    title: {
      type: String,
      required: [true, 'Le titre est requis'],
      trim: true,
      minlength: [3, 'Le titre doit faire au moins 3 caractères'],
      maxlength: [120, 'Le titre ne peut pas dépasser 120 caractères'],
    },
    description: {
      type: String,
      required: [true, 'La description est requise'],
      trim: true,
      minlength: [10, 'La description doit faire au moins 10 caractères'],
      maxlength: [2000, 'La description ne peut pas dépasser 2000 caractères'],
    },
    type: {
      type: String,
      enum: {
        values: Object.values(AnnonceType),
        message: 'Le type doit être : vente, pret ou demandePret',
      },
      required: [true, 'Le type est requis'],
    },
    category: {
      type: String,
      trim: true,
      maxlength: [50, 'La catégorie ne peut pas dépasser 50 caractères'],
    },
    status: {
      type: String,
      enum: Object.values(AnnonceStatus),
      default: AnnonceStatus.DISPONIBLE,
    },
    images: {
      type: [String],
      default: [],
    },
    price: {
      type: Number,
      min: [0, 'Le prix ne peut pas être négatif'],
      // Required conditionally in controller based on type
    },
    exchangeFor: {
      type: String,
      trim: true,
      minlength: [5, 'La description d\'échange doit faire au moins 5 caractères'],
      maxlength: [500, 'La description d\'échange ne peut pas dépasser 500 caractères'],
      // Required conditionally in controller based on type
    },
    exchangeImage: {
      type: String,
      // URL to image of the item being exchanged for
    },
    borrowPeriod: {
      type: String,
      trim: true,
      minlength: [3, 'La période doit faire au moins 3 caractères'],
      maxlength: [100, 'La période ne peut pas dépasser 100 caractères'],
      // Required conditionally in controller based on type
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Le propriétaire est requis'],
    },
    riskScore: {
      type: Number,
      default: 0,
      min: [0, 'Le score de risque ne peut pas être négatif'],
      max: [100, 'Le score de risque ne peut pas dépasser 100'],
    },
    isSuspicious: {
      type: Boolean,
      default: false,
    },
    suspiciousReasons: {
      type: [String],
      default: [],
    },
    reportCount: {
      type: Number,
      default: 0,
      min: [0, 'Le nombre de signalements ne peut pas être négatif'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { __v, ...clean } = ret;
        return clean;
      },
    },
  },
);

/* ───────── Index ───────── */

annonceSchema.index({ owner: 1 });
annonceSchema.index({ type: 1 });
annonceSchema.index({ status: 1 });
annonceSchema.index({ category: 1 });
annonceSchema.index({ createdAt: -1 });
annonceSchema.index({ title: 'text', description: 'text' });

/* ───────── Export ───────── */

const Annonce = mongoose.model<IAnnonce>('Annonce', annonceSchema);
export default Annonce;
