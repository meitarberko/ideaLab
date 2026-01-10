import { Schema, model, Types } from "mongoose";

export type AuthProvider = "local" | "google";

export interface UserDoc {
  _id: Types.ObjectId;
  username: string;
  email: string;
  passwordHash?: string;
  provider: AuthProvider;
  googleId?: string;
  avatarUrl?: string;
  refreshTokenHashes: string[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDoc>(
  {
    username: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, index: true },
    passwordHash: { type: String },
    provider: { type: String, required: true },
    googleId: { type: String },
    avatarUrl: { type: String },
    refreshTokenHashes: { type: [String], default: [] }
  },
  { timestamps: true }
);

export const User = model<UserDoc>("User", userSchema);
