import mongoose, { Document, Schema, Types } from 'mongoose';

/* ───────── Interface ───────── */

export interface IMessage extends Document {
  echangeId: Types.ObjectId;
  expediteur: Types.ObjectId;
  contenu: string;
  createdAt: Date;
  updatedAt: Date;
}

/* ───────── Schéma ───────── */

const messageSchema = new Schema<IMessage>(
  {
    echangeId: {
      type: Schema.Types.ObjectId,
      ref: 'Echange',
      required: [true, "L'exchange est requis"],
    },
    expediteur: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "L'expéditeur est requis"],
    },
    contenu: {
      type: String,
      required: [true, 'Le contenu est requis'],
      trim: true,
      minlength: [1, 'Le message ne peut pas être vide'],
      maxlength: [5000, 'Le message ne peut pas dépasser 5000 caractères'],
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

messageSchema.index({ echangeId: 1, createdAt: 1 });
messageSchema.index({ expediteur: 1 });
messageSchema.index({ createdAt: -1 });

/* ───────── Export ───────── */

const Message = mongoose.model<IMessage>('Message', messageSchema);
export default Message;
