import mongoose, { Document, Schema, Types } from 'mongoose';

/* ───────── Types ───────── */

export enum EchangeStatus {
  EN_ATTENTE = 'EN_ATTENTE',
  ACCEPTE = 'ACCEPTE',
  TERMINE = 'TERMINE',
  REFUSE = 'REFUSE',
  ANNULE = 'ANNULE',
}

/* ───────── Interface ───────── */

export interface IEchange extends Document {
  utilisateurDemandeur: Types.ObjectId;
  utilisateurProprietaire: Types.ObjectId;
  annonce: Types.ObjectId;
  statut: EchangeStatus;
  messageInitial?: string;
  lieuEchange?: string;
  prixFinal?: number;
  historique: Array<{
    de?: EchangeStatus | null;
    vers: EchangeStatus;
    par: Types.ObjectId;
    a: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

/* ───────── Schéma ───────── */

const echangeSchema = new Schema<IEchange>(
  {
    utilisateurDemandeur: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Le demandeur est requis'],
    },
    utilisateurProprietaire: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Le propriétaire est requis'],
    },
    annonce: {
      type: Schema.Types.ObjectId,
      ref: 'Annonce',
      required: [true, "L'annonce est requise"],
    },
    statut: {
      type: String,
      enum: Object.values(EchangeStatus),
      default: EchangeStatus.EN_ATTENTE,
    },
    messageInitial: {
      type: String,
      trim: true,
      maxlength: [1000, 'Le message initial ne peut pas dépasser 1000 caractères'],
    },
    lieuEchange: {
      type: String,
      trim: true,
      maxlength: [500, 'Le lieu d\'échange ne peut pas dépasser 500 caractères'],
    },
    prixFinal: {
      type: Number,
      min: [0, 'Le prix ne peut pas être négatif'],
    },
    historique: {
      type: [
        {
          de: {
            type: String,
            enum: [...Object.values(EchangeStatus), null],
            default: null,
          },
          vers: {
            type: String,
            enum: Object.values(EchangeStatus),
            required: true,
          },
          par: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
          },
          a: {
            type: Date,
            default: Date.now,
            required: true,
          },
        },
      ],
      default: [],
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

echangeSchema.index({ utilisateurDemandeur: 1 });
echangeSchema.index({ utilisateurProprietaire: 1 });
echangeSchema.index({ annonce: 1 });
echangeSchema.index({ statut: 1 });
echangeSchema.index({ createdAt: -1 });
echangeSchema.index({ utilisateurDemandeur: 1, utilisateurProprietaire: 1, annonce: 1 }, { unique: true });

/* ───────── Export ───────── */

const Echange = mongoose.model<IEchange>('Echange', echangeSchema);
export default Echange;
