import mongoose, { Document, Schema, Types } from 'mongoose';

/* ───────── Types ───────── */

export enum ReportType {
  ANNONCE = 'annonce',
  USER = 'user',
  MESSAGE = 'message',
}

export enum ReportStatus {
  OUVERT = 'ouvert',
  EN_COURS = 'en_cours',
  RESOLU = 'resolu',
}

export enum ReportReason {
  ARNAQUE = 'arnaque',
  CONTENU_OFFENSANT = 'contenu_offensant',
  SPAM = 'spam',
  CONTACT_EXTERNE = 'contact_externe',
  PRIX_SUSPECT = 'prix_suspect',
  AUTRE = 'autre',
}

/* ───────── Interface ───────── */

export interface IReport extends Document {
  type: ReportType;
  targetId: Types.ObjectId; // ID de l'annonce, utilisateur ou message
  targetType: string; // 'Annonce', 'User', 'Message'
  reportedBy: Types.ObjectId; // Utilisateur qui signale
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  adminNotes?: string;
  resolvedBy?: Types.ObjectId;
  resolvedAt?: Date;
  riskScoreDelta?: number; // Amount the risk score increased when report was created
  createdAt: Date;
  updatedAt: Date;
}

/* ───────── Schéma ───────── */

const reportSchema = new Schema<IReport>(
  {
    type: {
      type: String,
      enum: Object.values(ReportType),
      required: [true, 'Le type de signalement est requis'],
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: [true, 'L\'ID cible est requis'],
    },
    targetType: {
      type: String,
      enum: ['Annonce', 'User', 'Message'],
      required: [true, 'Le type cible est requis'],
    },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'L\'utilisateur qui signale est requis'],
    },
    reason: {
      type: String,
      enum: Object.values(ReportReason),
      required: [true, 'La raison est requise'],
    },
    description: {
      type: String,
      required: [true, 'La description est requise'],
      trim: true,
      minlength: [10, 'La description doit faire au moins 10 caractères'],
      maxlength: [1000, 'La description ne peut pas dépasser 1000 caractères'],
    },
    status: {
      type: String,
      enum: Object.values(ReportStatus),
      default: ReportStatus.OUVERT,
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
      index: true,
    },
    adminNotes: {
      type: String,
      trim: true,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: {
      type: Date,
    },
    riskScoreDelta: {
      type: Number,
      default: 0,
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

reportSchema.index({ targetId: 1, type: 1 });
reportSchema.index({ reportedBy: 1 });
reportSchema.index({ status: 1, priority: -1 });
reportSchema.index({ createdAt: -1 });
reportSchema.index({ targetType: 1 });

/* ───────── Export ───────── */

const Report = mongoose.model<IReport>('Report', reportSchema);
export default Report;
