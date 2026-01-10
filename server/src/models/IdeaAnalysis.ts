import { Schema, model, Types } from "mongoose";

export interface IdeaAnalysisDoc {
  _id: Types.ObjectId;
  ideaId: Types.ObjectId;
  ideaUpdatedAt: Date;
  question: string;
  result: {
    ideaDevelopment: string;
    competitors: string[];
    risks: string[];
    opportunities: string[];
    improvements: string[];
    searchDirections: string[];
  };
  createdAt: Date;
}

const ideaAnalysisSchema = new Schema<IdeaAnalysisDoc>(
  {
    ideaId: { type: Schema.Types.ObjectId, required: true, ref: "Idea", index: true },
    ideaUpdatedAt: { type: Date, required: true },
    question: { type: String, required: true },
    result: {
      ideaDevelopment: { type: String, required: true },
      competitors: { type: [String], required: true },
      risks: { type: [String], required: true },
      opportunities: { type: [String], required: true },
      improvements: { type: [String], required: true },
      searchDirections: { type: [String], required: true }
    }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ideaAnalysisSchema.index({ ideaId: 1, ideaUpdatedAt: 1, question: 1 }, { unique: true });

export const IdeaAnalysis = model<IdeaAnalysisDoc>("IdeaAnalysis", ideaAnalysisSchema);
