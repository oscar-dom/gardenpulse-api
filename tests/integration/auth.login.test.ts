import jwt from "jsonwebtoken";
import request from "supertest";
import { app } from "../../src/app.js";
import { UserModel } from "../../src/models/user.model.js";
import { useTestDatabase } from "./helpers/db.js";

useTestDatabase();

const credentials = { email: "ada@example.com", password: "plain-secret-123" };

const login = (body: object) => request(app).post("/api/auth/login").send(body);

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await UserModel.create({ name: "Ada Gardener", ...credentials });
  });

  it("returns a signed token for the user and the user without password", async () => {
    const res = await login({ ...credentials, email: "  ADA@example.com " });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data.user.email).toBe("ada@example.com");
    expect(res.body.data.user).not.toHaveProperty("password");

    const payload = jwt.verify(res.body.data.token, process.env.JWT_SECRET!) as jwt.JwtPayload;
    expect(payload.sub).toBe(res.body.data.user.id);
    expect(payload.exp).toBeGreaterThan(payload.iat!);
  });

  it("responds 401 with the same message for a wrong password or unknown email", async () => {
    const wrongPassword = await login({ ...credentials, password: "wrong-password" });
    const unknownEmail = await login({ ...credentials, email: "nobody@example.com" });

    for (const res of [wrongPassword, unknownEmail]) {
      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        status: "fail",
        error: "Unauthorized",
        message: "Invalid email or password.",
      });
    }
  });

  it("responds 400 when a field is missing", async () => {
    const res = await login({});

    expect(res.status).toBe(400);
    const fields = res.body.details.map((issue: { field: string }) => issue.field);
    expect(fields).toEqual(expect.arrayContaining(["email", "password"]));
  });
});
