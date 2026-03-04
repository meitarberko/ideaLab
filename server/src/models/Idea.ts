import { Schema, model, Types } from "mongoose";

export interface IdeaDoc {
  _id: Types.ObjectId;
  authorId: Types.ObjectId;
  text: string;
  imageUrl?: string;
  analysisCache?: {
    createdAt: Date;
    analysis: {
      development: { question: string; explanation: string; examples: string[] };
      risks: { question: string; explanation: string; examples: string[] };
      opportunities: { question: string; explanation: string; examples: string[] };
      improvements: { question: string; explanation: string; examples: string[] };
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const ideaSchema = new Schema<IdeaDoc>(
  {
    authorId: { type: Schema.Types.ObjectId, required: true, ref: "User", index: true },
    text: { type: String, required: true },
    imageUrl: { type: String },
    analysisCache: {
      createdAt: { type: Date },
      analysis: {
        development: {
          question: { type: String },
          explanation: { type: String },
          examples: { type: [String], default: undefined }
        },
        risks: {
          question: { type: String },
          explanation: { type: String },
          examples: { type: [String], default: undefined }
        },
        opportunities: {
          question: { type: String },
          explanation: { type: String },
          examples: { type: [String], default: undefined }
        },
        improvements: {
          question: { type: String },
          explanation: { type: String },
          examples: { type: [String], default: undefined }
        }
      }
    }
  },
  { timestamps: true }
);

export const Idea = model<IdeaDoc>("Idea", ideaSchema);
