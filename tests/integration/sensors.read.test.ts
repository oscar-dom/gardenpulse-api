import { Types } from "mongoose";
import request from "supertest";
import { app } from "../../src/app.js";
import { createUserWithToken } from "./helpers/auth.js";
import { useTestDatabase } from "./helpers/db.js";
import { createSensor } from "./helpers/factories.js";

useTestDatabase();

let auth: string;

beforeEach(async () => {
  ({ auth } = await createUserWithToken("user"));
});

const get = (url: string) => request(app).get(url).set("Authorization", auth);

describe("GET /api/sensors", () => {
  it("lets any authenticated user list the catalog with pagination metadata", async () => {
    await createSensor({ name: "Bravo" });
    await createSensor({ name: "Alpha" });

    const res = await get("/api/sensors");

    expect(res.status).toBe(200);
    expect(res.body.data.sensors.map((s: { name: string }) => s.name)).toEqual(["Alpha", "Bravo"]);
    expect(res.body.data.sensors[0]).toMatchObject({ unit: "%", active: true });
    expect(res.body.meta).toEqual({
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
      next: null,
      prev: null,
    });
  });

  it("paginates the results", async () => {
    for (let i = 0; i < 5; i++) await createSensor();

    const res = await get("/api/sensors?page=2&limit=2");

    expect(res.body.data.sensors).toHaveLength(2);
    expect(res.body.meta).toEqual({
      total: 5,
      page: 2,
      limit: 2,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: true,
      next: "?page=3&limit=2",
      prev: "?page=1&limit=2",
    });
  });

  it("lowers a limit above the maximum to 50", async () => {
    const res = await get("/api/sensors?limit=500");

    expect(res.status).toBe(200);
    expect(res.body.meta.limit).toBe(50);
  });

  it("filters by type and status", async () => {
    await createSensor({ type: "temperature", active: true });
    await createSensor({ type: "temperature", active: false });
    await createSensor({ type: "light", active: true });

    const res = await get("/api/sensors?type=temperature&active=false");

    expect(res.body.data.sensors).toHaveLength(1);
    expect(res.body.data.sensors[0]).toMatchObject({ type: "temperature", active: false });
    expect(res.body.meta.total).toBe(1);
  });

  it("responds 400 for invalid query parameters", async () => {
    const res = await get("/api/sensors?page=0&limit=0&type=wind&active=yes");

    expect(res.status).toBe(400);
    const fields = res.body.details.map((issue: { field: string }) => issue.field);
    expect(fields).toEqual(["page", "limit", "type", "active"]);
  });

  it("responds 401 without a token", async () => {
    const res = await request(app).get("/api/sensors");

    expect(res.status).toBe(401);
  });
});

describe("GET /api/sensors/:id", () => {
  it("returns one sensor", async () => {
    const sensor = await createSensor({ name: "Tomato bed" });

    const res = await get(`/api/sensors/${sensor.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.sensor).toMatchObject({ id: sensor.id, name: "Tomato bed" });
  });

  it("responds 404 for a sensor that does not exist", async () => {
    const res = await get(`/api/sensors/${new Types.ObjectId().toString()}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ status: "fail", error: "NotFound", message: "Sensor not found." });
  });

  it("responds 400 for a malformed id", async () => {
    const res = await get("/api/sensors/not-an-id");

    expect(res.status).toBe(400);
    expect(res.body.details[0]).toMatchObject({ location: "params", field: "id" });
  });
});
