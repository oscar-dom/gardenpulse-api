import express from "express";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import request from "supertest";
import { app } from "../../src/app.js";
import { authenticateToken, authorizeRoles } from "../../src/middlewares/auth.middleware.js";
import { globalErrorHandler } from "../../src/middlewares/error.middleware.js";
import { UserModel } from "../../src/models/user.model.js";
import { signToken } from "../../src/services/token.service.js";
import { useTestDatabase } from "./helpers/db.js";

useTestDatabase();

const secret = process.env.JWT_SECRET!;

// A throwaway admin-only route, until the real admin endpoints exist.
const testApp = express();
testApp.get("/admin-only", authenticateToken, authorizeRoles("admin"), (_req, res) => {
  res.status(200).json({ status: "success" });
});
testApp.use(globalErrorHandler);

const createUser = (role: "admin" | "user" = "user") =>
  UserModel.create({
    name: "Ada Gardener",
    email: `${role}@example.com`,
    password: "plain-secret-123",
    role,
  });

describe("authenticateToken (GET /api/auth/me)", () => {
  it("returns the logged-in user for a valid token", async () => {
    const user = await createUser();

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${signToken(user.id)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ id: user.id, email: "user@example.com" });
    expect(res.body.data.user).not.toHaveProperty("password");
  });

  it.each([
    [
      "no Authorization header",
      undefined,
      "Unauthorized",
      "Authentication required. Send a Bearer token.",
    ],
    [
      "a non-Bearer scheme",
      "Basic abc123",
      "Unauthorized",
      "Authentication required. Send a Bearer token.",
    ],
    ["a malformed token", "Bearer not-a-jwt", "InvalidToken", "The token is not valid."],
    [
      "a token signed with another secret",
      `Bearer ${jwt.sign({ sub: new Types.ObjectId().toString() }, "another-secret-that-is-long-enough")}`,
      "InvalidToken",
      "The token is not valid.",
    ],
  ])("responds 401 for %s", async (_case, header, error, message) => {
    const req = request(app).get("/api/auth/me");
    const res = await (header ? req.set("Authorization", header) : req);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ status: "fail", error, message });
  });

  it("responds 401 for an expired token", async () => {
    const user = await createUser();
    const expired = jwt.sign({ sub: user.id, exp: Math.floor(Date.now() / 1000) - 60 }, secret);

    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${expired}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("InvalidToken");
    expect(res.body.message).toBe("The token has expired. Log in again.");
  });

  it("responds 401 when the user no longer exists", async () => {
    const user = await createUser();
    const token = signToken(user.id);
    await user.deleteOne();

    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("InvalidToken");
    expect(res.body.message).toBe("The user for this token no longer exists.");
  });
});

describe("authorizeRoles", () => {
  it("lets an admin through", async () => {
    const admin = await createUser("admin");

    const res = await request(testApp)
      .get("/admin-only")
      .set("Authorization", `Bearer ${signToken(admin.id)}`);

    expect(res.status).toBe(200);
  });

  it("responds 403 to an authenticated user without the role", async () => {
    const user = await createUser("user");

    const res = await request(testApp)
      .get("/admin-only")
      .set("Authorization", `Bearer ${signToken(user.id)}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      status: "fail",
      error: "Forbidden",
      message: "You do not have permission to perform this action.",
    });
  });

  it("responds 401, not 403, when there is no token", async () => {
    const res = await request(testApp).get("/admin-only");

    expect(res.status).toBe(401);
  });

  it("uses the current role, so a promotion applies without logging in again", async () => {
    const user = await createUser("user");
    const token = signToken(user.id);
    await UserModel.updateOne({ _id: user.id }, { role: "admin" });

    const res = await request(testApp).get("/admin-only").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});
