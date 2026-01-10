import { GoogleGenerativeAI } from "@google/generative-ai";

export function geminiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is missing in environment variables");
  }
  return new GoogleGenerativeAI(key);
}