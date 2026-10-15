import mongoose, { Document, Schema, Types } from 'mongoose';

/* ───────── Interface ───────── */

export interface IBlock extends Document {
  blocker: Types.ObjectId; // Utilisateur qui bloque
  blocked: Types.ObjectId; // Utilisateur bloqué
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

/* ───────── Schéma ───────── */

const blockSchema = new Schema<IBlock>(
  {
    blocker: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "L'utilisateur qui bloque est requis"],
    },
    blocked: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "L'utilisateur bloqué est requis"],
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [200, 'La raison ne peut pas dépasser 200 caractères'],
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

blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });
blockSchema.index({ blocker: 1 });
blockSchema.index({ blocked: 1 });

const Block = mongoose.model<IBlock>('Block', blockSchema);
export default Block;
