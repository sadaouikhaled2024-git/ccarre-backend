import mongoose, { Document, Schema, Types } from 'mongoose';

/* ───────── Types ───────── */

export enum NotificationType {
  MESSAGE = 'MESSAGE',
  ECHANGE_REQUEST = 'ECHANGE_REQUEST',
  ECHANGE_ACCEPTED = 'ECHANGE_ACCEPTED',
  ECHANGE_REFUSED = 'ECHANGE_REFUSED',
  ECHANGE_COMPLETED = 'ECHANGE_COMPLETED',
  BAN_WARNING = 'BAN_WARNING',
  USER_WARNING = 'USER_WARNING',
  ANNONCE_REMOVED = 'ANNONCE_REMOVED',
}

/* ───────── Interface ───────── */

export interface INotification extends Document {
  user: Types.ObjectId;
  notifiedBy?: Types.ObjectId;
  type: NotificationType;
  contenu: string;
  read: boolean;
  relatedEchange?: Types.ObjectId;
  relatedMessage?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/* ───────── Schéma ───────── */

const notificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "L'utilisateur est requis"],
    },
    notifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: [true, 'Le type est requis'],
    },
    contenu: {
      type: String,
      required: [true, 'Le contenu est requis'],
      trim: true,
      maxlength: [500, 'Le contenu ne peut pas dépasser 500 caractères'],
    },
    read: {
      type: Boolean,
      default: false,
    },
    relatedEchange: {
      type: Schema.Types.ObjectId,
      ref: 'Echange',
    },
    relatedMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
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

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });
notificationSchema.index({ relatedEchange: 1 });

/* ───────── Export ───────── */

const Notification = mongoose.model<INotification>('Notification', notificationSchema);
export default Notification;
