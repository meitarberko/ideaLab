import errorHandler from "../../middleware/errorHandler";

function makeRes() {
  return {
    headersSent: false,
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  } as any;
}

test("errorHandler passes through when headers sent", () => {
  const req = {} as any;
  const res = makeRes();
  res.headersSent = true;
  const next = jest.fn();

  errorHandler(new Error("boom"), req, res, next);
  expect(next).toHaveBeenCalled();
});

test("errorHandler handles multipart errors", () => {
  const req = {} as any;
  const res = makeRes();
  const next = jest.fn();

  errorHandler({ name: "MulterError" }, req, res, next);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({ message: "Invalid multipart form data" })
  );
});

test("errorHandler detects multipart message hints", () => {
  const req = {} as any;
  const res = makeRes();
  const next = jest.fn();

  errorHandler({ message: "Multipart boundary not found" }, req, res, next);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({ message: "Invalid multipart form data" })
  );
});

test("errorHandler handles client errors", () => {
  const req = {} as any;
  const res = makeRes();
  const next = jest.fn();

  errorHandler({ status: 400, message: "Bad request" }, req, res, next);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({ message: "Bad request" });
});

test("errorHandler hides server errors", () => {
  const req = {} as any;
  const res = makeRes();
  const next = jest.fn();

  errorHandler(new Error("boom"), req, res, next);
  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
});
