import request from "supertest";
import { app } from "../../src/app.js";
import { ensureAdmin } from "../../src/services/admin.service.js";
import { useTestDatabase } from "./helpers/db.js";

useTestDatabase();

// End-to-end flow through the real endpoints (only the first admin is seeded): sign up,
// get the admin role approved, log in, then create, read, update and delete a sensor.
describe("Sensor lifecycle", () => {
  it("goes from creation to deletion through the API", async () => {
    // An existing admin (as created by npm run seed:admin) approves a new user's request.
    await ensureAdmin({ name: "Root", email: "root@example.com", password: "root-secret-123" });
    const rootLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "root@example.com", password: "root-secret-123" });
    const rootAuth = `Bearer ${rootLogin.body.data.token}`;

    const signUp = await request(app).post("/api/auth/register").send({
      name: "Grace Planter",
      email: "grace@example.com",
      password: "grace-secret-123",
      requestAdmin: true,
    });
    expect(signUp.status).toBe(201);

    const approval = await request(app)
      .patch(`/api/users/${signUp.body.data.user.id}/admin-request`)
      .set("Authorization", rootAuth)
      .send({ decision: "approve" });
    expect(approval.status).toBe(200);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "grace@example.com", password: "grace-secret-123" });
    const auth = `Bearer ${login.body.data.token}`;

    // Create
    const created = await request(app).post("/api/sensors").set("Authorization", auth).send({
      name: "Greenhouse temperature",
      type: "temperature",
      location: "Greenhouse",
      threshold: 35,
    });
    expect(created.status).toBe(201);
    const location = created.headers.location as string;

    // Read
    const read = await request(app).get(location).set("Authorization", auth);
    expect(read.status).toBe(200);
    expect(read.body.data.sensor).toMatchObject({ name: "Greenhouse temperature", unit: "°C" });

    // Update
    const updated = await request(app)
      .patch(location)
      .set("Authorization", auth)
      .send({ threshold: 32 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.sensor.threshold).toBe(32);

    // Delete
    const deleted = await request(app).delete(location).set("Authorization", auth);
    expect(deleted.status).toBe(204);

    const gone = await request(app).get(location).set("Authorization", auth);
    expect(gone.status).toBe(404);
  });
});
