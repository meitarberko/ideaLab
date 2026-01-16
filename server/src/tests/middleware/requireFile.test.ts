import { requireFile } from "../../middleware/requireFile";

function makeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  } as any;
}

test("requireFile rejects missing file", () => {
  const middleware = requireFile("avatar");
  const req = {} as any;
  const res = makeRes();
  const next = jest.fn();

  middleware(req, res, next);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({ message: "Validation error" })
  );
  expect(next).not.toHaveBeenCalled();
});

test("requireFile accepts file", () => {
  const middleware = requireFile("avatar");
  const req = { file: { path: "file.txt" } } as any;
  const res = makeRes();
  const next = jest.fn();

  middleware(req, res, next);
  expect(next).toHaveBeenCalled();
});
