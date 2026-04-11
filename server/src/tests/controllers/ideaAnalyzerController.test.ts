import { Request, Response } from "express";

jest.mock("../../models/Idea", () => ({
  Idea: {
    findById: jest.fn()
  }
}));

jest.mock("../../services/groqService", () => ({
  analyzeIdeaWithGroq: jest.fn()
}));

import { analyzeIdeaController } from "../../controllers/ideaAnalyzerController";
import { Idea } from "../../models/Idea";
import { analyzeIdeaWithGroq } from "../../services/groqService";

function makeRes() {
  const res = {
    status: jest.fn(),
    json: jest.fn()
  } as unknown as Response;

  (res.status as jest.Mock).mockReturnValue(res);
  return res;
}

describe("ideaAnalyzerController", () => {
  const mockedFindById = jest.mocked(Idea.findById);
  const mockedAnalyze = jest.mocked(analyzeIdeaWithGroq);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("returns 400 for invalid idea id", async () => {
    const req = { params: { id: "bad-id" } } as unknown as Request;
    const res = makeRes();

    await analyzeIdeaController(req, res);

    expect(mockedFindById).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid idea id" });
  });

  test("returns 404 when idea is missing", async () => {
    const req = { params: { id: "507f1f77bcf86cd799439011" } } as unknown as Request;
    const res = makeRes();
    mockedFindById.mockResolvedValueOnce(null as never);

    await analyzeIdeaController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Idea not found" });
  });

  test("returns cached analysis without calling service", async () => {
    const req = { params: { id: "507f1f77bcf86cd799439011" } } as unknown as Request;
    const res = makeRes();
    const idea = {
      _id: "507f1f77bcf86cd799439011",
      text: "idea text",
      analysisCache: {
        createdAt: new Date(),
        analysis: {
          development: { question: "d", explanation: "d", examples: [] },
          risks: { question: "r", explanation: "r", examples: [] },
          opportunities: { question: "o", explanation: "o", examples: [] },
          improvements: { question: "i", explanation: "i", examples: [] }
        }
      }
    };
    mockedFindById.mockResolvedValueOnce(idea as never);

    await analyzeIdeaController(req, res);

    expect(mockedAnalyze).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      ideaId: String(idea._id),
      analysis: idea.analysisCache.analysis,
      cached: true
    });
  });

  test("stores fresh analysis and returns uncached response", async () => {
    const req = { params: { id: "507f1f77bcf86cd799439011" } } as unknown as Request;
    const res = makeRes();
    const save = jest.fn().mockResolvedValue(undefined);
    const idea = {
      _id: "507f1f77bcf86cd799439011",
      text: "idea text",
      analysisCache: undefined,
      save
    };
    const analysis = {
      development: { question: "d", explanation: "d", examples: [] },
      risks: { question: "r", explanation: "r", examples: [] },
      opportunities: { question: "o", explanation: "o", examples: [] },
      improvements: { question: "i", explanation: "i", examples: [] }
    };
    mockedFindById.mockResolvedValueOnce(idea as never);
    mockedAnalyze.mockResolvedValueOnce(analysis);

    await analyzeIdeaController(req, res);

    expect(mockedAnalyze).toHaveBeenCalledWith("idea text");
    expect(save).toHaveBeenCalled();
    expect(idea.analysisCache).toEqual(
      expect.objectContaining({
        analysis
      })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      ideaId: String(idea._id),
      analysis,
      cached: false
    });
  });

  test("maps missing groq config error to configured message", async () => {
    const req = { params: { id: "507f1f77bcf86cd799439011" } } as unknown as Request;
    const res = makeRes();
    mockedFindById.mockResolvedValueOnce({
      _id: "507f1f77bcf86cd799439011",
      text: "idea text",
      analysisCache: undefined
    } as never);
    mockedAnalyze.mockRejectedValueOnce(new Error("GROQ_API_KEY missing"));

    await analyzeIdeaController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Analyzer service is not configured" });
  });

  test("maps upstream 502 errors to AI service error", async () => {
    const req = { params: { id: "507f1f77bcf86cd799439011" } } as unknown as Request;
    const res = makeRes();
    mockedFindById.mockResolvedValueOnce({
      _id: "507f1f77bcf86cd799439011",
      text: "idea text",
      analysisCache: undefined
    } as never);
    mockedAnalyze.mockRejectedValueOnce({ status: 502, message: "bad gateway" });

    await analyzeIdeaController(req, res);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({ message: "AI service error" });
  });

  test("returns explicit client error messages for non-500 errors", async () => {
    const req = { params: { id: "507f1f77bcf86cd799439011" } } as unknown as Request;
    const res = makeRes();
    mockedFindById.mockResolvedValueOnce({
      _id: "507f1f77bcf86cd799439011",
      text: "idea text",
      analysisCache: undefined
    } as never);
    mockedAnalyze.mockRejectedValueOnce({ status: 400, message: "bad request" });

    await analyzeIdeaController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "bad request" });
  });
});
