import { geminiClient } from "../../lib/gemini";
import { GoogleGenerativeAI } from "@google/generative-ai";

jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn()
}));

test("geminiClient throws when GEMINI_API_KEY missing", () => {
  const saved = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  expect(() => geminiClient()).toThrow("GEMINI_API_KEY is missing in environment variables");

  if (saved !== undefined) process.env.GEMINI_API_KEY = saved;
});

test("geminiClient returns client when key exists", () => {
  process.env.GEMINI_API_KEY = "test-key";

  const client = geminiClient();
  expect(GoogleGenerativeAI).toHaveBeenCalledWith("test-key");
  expect(client).toBeTruthy();
});
