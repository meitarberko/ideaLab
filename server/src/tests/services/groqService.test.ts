const mockCreate = jest.fn();

jest.mock("groq-sdk", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate
      }
    }
  }))
}));

import { analyzeIdeaWithGroq } from "../../services/groqService";

describe("groqService", () => {
  const originalApiKey = process.env.GROQ_API_KEY;
  const originalModel = process.env.GROQ_MODEL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GROQ_API_KEY = "test-groq-key";
    process.env.GROQ_MODEL = "test-model";
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    if (originalApiKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalApiKey;

    if (originalModel === undefined) delete process.env.GROQ_MODEL;
    else process.env.GROQ_MODEL = originalModel;

    jest.restoreAllMocks();
  });

  test("returns parsed analysis from groq response wrapped in fences", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: [
              "```json",
              JSON.stringify({
                development: {
                  question: "Dev?",
                  explanation: "Explain dev",
                  examples: ["a"]
                },
                risks: {
                  question: "Risk?",
                  explanation: "Explain risk",
                  examples: []
                },
                opportunities: {
                  question: "Opp?",
                  explanation: "Explain opp",
                  examples: ["b"]
                },
                improvements: {
                  question: "Improve?",
                  explanation: "Explain improve",
                  examples: ["c"]
                }
              }),
              "```"
            ].join("\n")
          }
        }
      ]
    });

    const result = await analyzeIdeaWithGroq("idea text");

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "test-model",
        messages: expect.arrayContaining([
          expect.objectContaining({ role: "system" }),
          expect.objectContaining({ role: "user", content: expect.stringContaining("idea text") })
        ])
      })
    );
    expect(result.development.question).toBe("Dev?");
    expect(result.improvements.examples).toEqual(["c"]);
  });

  test("returns fallback when api key is missing", async () => {
    delete process.env.GROQ_API_KEY;

    const result = await analyzeIdeaWithGroq("idea text");

    expect(mockCreate).not.toHaveBeenCalled();
    expect(result.development.question).toContain("development directions");
  });

  test("returns fallback when groq request fails", async () => {
    mockCreate.mockRejectedValueOnce(new Error("network fail"));

    const result = await analyzeIdeaWithGroq("idea text");

    expect(result.risks.question).toContain("risks or challenges");
  });

  test("returns fallback when response json cannot be parsed", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "not json at all" } }]
    });

    const result = await analyzeIdeaWithGroq("idea text");

    expect(result.opportunities.question).toContain("potential opportunities");
  });

  test("returns fallback when response shape is invalid", async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              development: { question: "only partial" }
            })
          }
        }
      ]
    });

    const result = await analyzeIdeaWithGroq("idea text");

    expect(result.improvements.question).toContain("ways to improve");
  });
});
