import { Types } from "mongoose";
import request from "supertest";
import { app } from "../../src/app.js";
import { UserModel } from "../../src/models/user.model.js";
import { createUserWithToken } from "./helpers/auth.js";
import { useTestDatabase } from "./helpers/db.js";

useTestDatabase();

const decide = (id: string, auth: string, decision: unknown) =>
  request(app)
    .patch(`/api/users/${id}/admin-request`)
    .set("Authorization", auth)
    .send({ decision });

describe("Admin requests", () => {
  describe("GET /api/users/admin-requests", () => {
    it("lists only pending requests, oldest first", async () => {
      const { auth } = await createUserWithToken("admin");
      const { user: first } = await createUserWithToken("user", { adminRequest: "pending" });
      const { user: second } = await createUserWithToken("user", { adminRequest: "pending" });
      await createUserWithToken("user", { adminRequest: "rejected" });
      await createUserWithToken("user");

      const res = await request(app).get("/api/users/admin-requests").set("Authorization", auth);

      expect(res.status).toBe(200);
      expect(res.body.data.users.map((u: { id: string }) => u.id)).toEqual([first.id, second.id]);
      expect(res.body.data.users[0]).not.toHaveProperty("password");
    });

    it("responds 401 without a token and 403 for a regular user", async () => {
      const { auth } = await createUserWithToken("user");

      const anonymous = await request(app).get("/api/users/admin-requests");
      const regular = await request(app)
        .get("/api/users/admin-requests")
        .set("Authorization", auth);

      expect(anonymous.status).toBe(401);
      expect(regular.status).toBe(403);
    });
  });

  describe("PATCH /api/users/:id/admin-request", () => {
    it("approves a pending request and makes the user an admin", async () => {
      const { auth } = await createUserWithToken("admin");
      const { user } = await createUserWithToken("user", { adminRequest: "pending" });

      const res = await decide(user.id, auth, "approve");

      expect(res.status).toBe(200);
      expect(res.body.data.user).toMatchObject({ role: "admin", adminRequest: "approved" });
    });

    it("rejects a pending request and keeps the user role", async () => {
      const { auth } = await createUserWithToken("admin");
      const { user } = await createUserWithToken("user", { adminRequest: "pending" });

      const res = await decide(user.id, auth, "reject");

      expect(res.status).toBe(200);
      expect(res.body.data.user).toMatchObject({ role: "user", adminRequest: "rejected" });
    });

    it("lets the approved user use admin endpoints straight away", async () => {
      const { auth: adminAuth } = await createUserWithToken("admin");
      const { user, auth } = await createUserWithToken("user", { adminRequest: "pending" });

      await decide(user.id, adminAuth, "approve");
      const res = await request(app).get("/api/users/admin-requests").set("Authorization", auth);

      expect(res.status).toBe(200);
    });

    it("responds 409 when there is no pending request to decide", async () => {
      const { auth } = await createUserWithToken("admin");
      const { user: never } = await createUserWithToken("user");
      const { user: rejected } = await createUserWithToken("user", { adminRequest: "rejected" });

      for (const user of [never, rejected]) {
        const res = await decide(user.id, auth, "approve");
        expect(res.status).toBe(409);
        expect(res.body.message).toBe("This user has no pending admin request.");
      }
      expect(await UserModel.countDocuments({ role: "admin" })).toBe(1);
    });

    it("responds 404 for an unknown user and 400 for invalid input", async () => {
      const { auth } = await createUserWithToken("admin");

      const unknown = await decide(new Types.ObjectId().toString(), auth, "approve");
      const invalidId = await decide("not-an-id", auth, "approve");
      const invalidDecision = await decide(new Types.ObjectId().toString(), auth, "maybe");

      expect(unknown.status).toBe(404);
      expect(invalidId.status).toBe(400);
      expect(invalidId.body.details[0].field).toBe("id");
      expect(invalidDecision.status).toBe(400);
      expect(invalidDecision.body.details[0].field).toBe("decision");
    });

    it("responds 403 to a regular user", async () => {
      const { auth } = await createUserWithToken("user");
      const { user } = await createUserWithToken("user", { adminRequest: "pending" });

      const res = await decide(user.id, auth, "approve");

      expect(res.status).toBe(403);
      expect((await UserModel.findById(user.id).orFail()).role).toBe("user");
    });
  });
});
