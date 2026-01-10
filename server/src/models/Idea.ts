import { Schema, model, Types } from "mongoose";

export interface IdeaDoc {
  _id: Types.ObjectId;
  authorId: Types.ObjectId;
  text: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ideaSchema = new Schema<IdeaDoc>(
  {
    authorId: { type: Schema.Types.ObjectId, required: true, ref: "User", index: true },
    text: { type: String, required: true },
    imageUrl: { type: String }
  },
  { timestamps: true }
);

export const Idea = model<IdeaDoc>("Idea", ideaSchema);
