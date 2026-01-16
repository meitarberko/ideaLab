jest.mock("mongoose", () => {
  const connect = jest.fn().mockResolvedValue(undefined);
  const disconnect = jest.fn().mockResolvedValue(undefined);
  return { __esModule: true, default: { connect, disconnect }, connect, disconnect };
});

jest.mock("mongodb-memory-server", () => {
  const stop = jest.fn().mockResolvedValue(undefined);
  const create = jest.fn().mockResolvedValue({
    getUri: () => "mongodb://test",
    stop
  });
  return { MongoMemoryServer: { create }, __mocks: { create, stop } };
});

import { startTestMongo, stopTestMongo } from "./mongoTest";

const mongooseMock = jest.requireMock("mongoose") as any;
const mongoMock = jest.requireMock("mongodb-memory-server") as any;
const connect = mongooseMock.connect as jest.Mock;
const disconnect = mongooseMock.disconnect as jest.Mock;
const createMock = mongoMock.__mocks.create as jest.Mock;
const stopMock = mongoMock.__mocks.stop as jest.Mock;

beforeEach(() => {
  connect.mockClear();
  disconnect.mockClear();
  stopMock.mockClear();
  createMock.mockClear();
});

test("stopTestMongo handles no server", async () => {
  await stopTestMongo();
  expect(disconnect).toHaveBeenCalled();
  expect(stopMock).not.toHaveBeenCalled();
});

test("startTestMongo and stopTestMongo manage server lifecycle", async () => {
  await startTestMongo();
  expect(createMock).toHaveBeenCalled();
  expect(connect).toHaveBeenCalledWith("mongodb://test");

  await stopTestMongo();
  expect(disconnect).toHaveBeenCalled();
  expect(stopMock).toHaveBeenCalled();
});
