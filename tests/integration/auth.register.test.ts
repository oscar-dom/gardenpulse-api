import request from "supertest";
import { app } from "../../src/app.js";
import { UserModel } from "../../src/models/user.model.js";
import { useTestDatabase } from "./helpers/db.js";

useTestDatabase();

const newUser = {
  name: "Ada Gardener",
  email: "Ada@Example.com",
  password: "plain-secret-123",
};

const register = (body: object) => request(app).post("/api/auth/register").send(body);

describe("POST /api/auth/register", () => {
  it("creates a regular user and never returns the password", async () => {
    const res = await register(newUser);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("success");
    expect(res.body.data.user).toMatchObject({
      name: "Ada Gardener",
      email: "ada@example.com",
      role: "user",
    });
    expect(res.body.data.user.id).toEqual(expect.any(String));
    expect(res.body.data.user).not.toHaveProperty("password");
    expect(res.body.data.user).not.toHaveProperty("adminRequest");
  });

  it("stores an admin request as pending without granting the role", async () => {
    const res = await register({ ...newUser, requestAdmin: true });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe("user");
    expect(res.body.data.user.adminRequest).toBe("pending");
  });

  it("ignores a role sent by the client", async () => {
    const res = await register({ ...newUser, role: "admin" });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe("user");
  });

  it("responds 409 when the email is already registered", async () => {
    await register(newUser);

    const res = await register({ ...newUser, email: "ADA@example.com" });

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ status: "fail", error: "Conflict" });
    expect(await UserModel.countDocuments()).toBe(1);
  });

  it("responds 400 with every invalid field", async () => {
    const res = await register({ email: "not-an-email", password: "short", requestAdmin: "yes" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("ValidationError");
    const fields = res.body.details.map((issue: { field: string }) => issue.field);
    expect(fields).toEqual(expect.arrayContaining(["name", "email", "password", "requestAdmin"]));
  });

  it("rejects passwords longer than bcrypt can use", async () => {
    const tooManyChars = await register({ ...newUser, password: "a".repeat(73) });
    // Only 37 characters, but 74 bytes: "ñ" takes two bytes in UTF-8.
    const tooManyBytes = await register({ ...newUser, password: "ñ".repeat(37) });

    expect(tooManyChars.status).toBe(400);
    expect(tooManyBytes.status).toBe(400);
    expect(tooManyBytes.body.details[0].message).toBe("password is too long");
  });
});
