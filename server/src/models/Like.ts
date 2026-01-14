import { Schema, model, Types } from "mongoose";

export interface LikeDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  ideaId: Types.ObjectId;
  createdAt: Date;
}

const likeSchema = new Schema<LikeDoc>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User", index: true },
    ideaId: { type: Schema.Types.ObjectId, required: true, ref: "Idea", index: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

likeSchema.index({ ideaId: 1, userId: 1 }, { unique: true });

export const Like = model<LikeDoc>("Like", likeSchema);