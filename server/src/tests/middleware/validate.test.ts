import { z } from "zod";
import { validateBody, validateParams } from "../../middleware/validate";

function makeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  } as any;
}

test("validateBody normalizes and validates", () => {
  const schema = z.object({ name: z.string().min(1) });
  const middleware = validateBody(schema);

  const req = { body: { " name ": " value " } } as any;
  const res = makeRes();
  const next = jest.fn();

  middleware(req, res, next);
  expect(next).toHaveBeenCalled();
  expect(req.validatedBody).toEqual({ name: "value" });
});

test("validateBody keeps non-string values", () => {
  const schema = z.object({ count: z.number(), flag: z.boolean() });
  const middleware = validateBody(schema);

  const req = { body: { count: 2, flag: false } } as any;
  const res = makeRes();
  const next = jest.fn();

  middleware(req, res, next);
  expect(next).toHaveBeenCalled();
  expect(req.validatedBody).toEqual({ count: 2, flag: false });
});

test("validateBody returns formatted errors", () => {
  const schema = z.object({ name: z.string().min(2) });
  const middleware = validateBody(schema);

  const req = { body: { name: "a" } } as any;
  const res = makeRes();
  const next = jest.fn();

  middleware(req, res, next);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({ message: "Validation error" })
  );
  expect(next).not.toHaveBeenCalled();
});

test("validateParams accepts valid params", () => {
  const schema = z.object({ id: z.string().min(1) });
  const middleware = validateParams(schema);

  const req = { params: { id: "123" } } as any;
  const res = makeRes();
  const next = jest.fn();

  middleware(req, res, next);
  expect(next).toHaveBeenCalled();
  expect(req.validatedParams).toEqual({ id: "123" });
});

test("validateParams returns formatted errors", () => {
  const schema = z.object({ id: z.string().min(2) });
  const middleware = validateParams(schema);

  const req = { params: { id: "1" } } as any;
  const res = makeRes();
  const next = jest.fn();

  middleware(req, res, next);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({ message: "Validation error" })
  );
  expect(next).not.toHaveBeenCalled();
});
