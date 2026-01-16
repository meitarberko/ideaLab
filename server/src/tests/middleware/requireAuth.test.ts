import { requireAuth } from "../../middleware/requireAuth";
import { signAccessToken } from "../../lib/tokens";

function makeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  } as any;
}

test("requireAuth rejects missing header", async () => {
  const req = { headers: {} } as any;
  const res = makeRes();
  const next = jest.fn();

  await requireAuth(req, res, next);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(next).not.toHaveBeenCalled();
});

test("requireAuth rejects invalid token", async () => {
  const req = { headers: { authorization: "Bearer bad" } } as any;
  const res = makeRes();
  const next = jest.fn();

  await requireAuth(req, res, next);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(next).not.toHaveBeenCalled();
});

test("requireAuth accepts valid token", async () => {
  const token = signAccessToken({ userId: "u1", username: "user" });
  const req = { headers: { authorization: `Bearer ${token}` } } as any;
  const res = makeRes();
  const next = jest.fn();

  await requireAuth(req, res, next);
  expect(next).toHaveBeenCalled();
  expect(req.user).toEqual({ userId: "u1", username: "user" });
});
