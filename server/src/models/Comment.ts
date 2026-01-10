import { Schema, model, Types } from "mongoose";

export interface CommentDoc {
  _id: Types.ObjectId;
  ideaId: Types.ObjectId;
  authorId: Types.ObjectId;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<CommentDoc>(
  {
    ideaId: { type: Schema.Types.ObjectId, required: true, ref: "Idea", index: true },
    authorId: { type: Schema.Types.ObjectId, required: true, ref: "User", index: true },
    text: { type: String, required: true }
  },
  { timestamps: true }
);

commentSchema.index({ ideaId: 1, createdAt: -1 });

export const Comment = model<CommentDoc>("Comment", commentSchema);
