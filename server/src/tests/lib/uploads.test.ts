import fs from "fs";
import { buildPublicUploadUrl, makeUploader } from "../../lib/uploads";

jest.mock("fs", () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn()
}));

const existsSync = fs.existsSync as jest.Mock;
const mkdirSync = fs.mkdirSync as jest.Mock;

beforeEach(() => {
  existsSync.mockReset();
  mkdirSync.mockReset();
});

test("makeUploader creates directory when missing", () => {
  existsSync.mockReturnValue(false);
  makeUploader("avatars");
  expect(mkdirSync).toHaveBeenCalled();
});

test("makeUploader skips directory creation when exists", () => {
  existsSync.mockReturnValue(true);
  makeUploader("ideas");
  expect(mkdirSync).not.toHaveBeenCalled();
});

test("buildPublicUploadUrl uses PUBLIC_BASE_URL when set", () => {
  const saved = process.env.PUBLIC_BASE_URL;
  process.env.PUBLIC_BASE_URL = "http://example.com";
  expect(buildPublicUploadUrl("avatars", "a.png")).toBe("http://example.com/uploads/avatars/a.png");
  if (saved === undefined) delete process.env.PUBLIC_BASE_URL;
  else process.env.PUBLIC_BASE_URL = saved;
});

test("buildPublicUploadUrl falls back to empty base", () => {
  const saved = process.env.PUBLIC_BASE_URL;
  delete process.env.PUBLIC_BASE_URL;
  expect(buildPublicUploadUrl("ideas", "i.png")).toBe("/uploads/ideas/i.png");
  if (saved !== undefined) process.env.PUBLIC_BASE_URL = saved;
});
