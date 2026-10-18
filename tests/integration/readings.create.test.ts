import { Types } from "mongoose";
import request from "supertest";
import { app } from "../../src/app.js";
import { ReadingModel } from "../../src/models/reading.model.js";
import { createUserWithToken } from "./helpers/auth.js";
import { useTestDatabase } from "./helpers/db.js";
import { createSensor } from "./helpers/factories.js";

useTestDatabase();

let auth: string;

beforeEach(async () => {
  ({ auth } = await createUserWithToken("user")); // regular users can record readings
});

const timestamp = "2026-10-18T10:00:00Z";

const post = (sensorId: string, body: object, token = auth) =>
  request(app).post(`/api/sensors/${sensorId}/readings`).set("Authorization", token).send(body);

describe("POST /api/sensors/:id/readings", () => {
  it("stores a normal reading and returns it with its sensor and unit", async () => {
    const sensor = await createSensor({
      name: "Greenhouse",
      type: "temperature",
      threshold: 35,
    });

    const res = await post(sensor.id, { value: 22.5, timestamp });

    expect(res.status).toBe(201);
    expect(res.body.data.reading).toMatchObject({
      value: 22.5,
      unit: "°C",
      timestamp: "2026-10-18T10:00:00.000Z",
      anomalous: false,
      sensor: { id: sensor.id, name: "Greenhouse", type: "temperature", unit: "°C" },
    });
    expect(res.headers.location).toBe(`/api/readings/${res.body.data.reading.id}`);
  });

  it("flags a reading above the threshold as anomalous", async () => {
    const sensor = await createSensor({ type: "temperature", threshold: 35 });

    const res = await post(sensor.id, { value: 38, timestamp });

    expect(res.status).toBe(201);
    expect(res.body.data.reading.anomalous).toBe(true);
  });

  it("flags a reading below the threshold when the direction is below", async () => {
    const sensor = await createSensor({ threshold: 25, thresholdDirection: "below" });

    const dry = await post(sensor.id, { value: 18, timestamp });
    const atLimit = await post(sensor.id, { value: 25, timestamp });

    expect(dry.body.data.reading.anomalous).toBe(true);
    expect(atLimit.body.data.reading.anomalous).toBe(false); // equal is normal
  });

  it("ignores an anomalous flag sent by the client", async () => {
    const sensor = await createSensor({ threshold: 30 });

    const res = await post(sensor.id, { value: 10, timestamp, anomalous: true });

    expect(res.status).toBe(201);
    expect(res.body.data.reading.anomalous).toBe(false);
  });

  it("responds 404 when the sensor does not exist", async () => {
    const res = await post(new Types.ObjectId().toString(), { value: 10, timestamp });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Sensor not found.");
    expect(await ReadingModel.countDocuments()).toBe(0);
  });

  it("responds 409 when the sensor is inactive", async () => {
    const sensor = await createSensor({ active: false });

    const res = await post(sensor.id, { value: 10, timestamp });

    expect(res.status).toBe(409);
    expect(await ReadingModel.countDocuments()).toBe(0);
  });

  it("responds 400 for a missing value, a bad date or a future date", async () => {
    const sensor = await createSensor();
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const missing = await post(sensor.id, {});
    const badDate = await post(sensor.id, { value: "high", timestamp: "yesterday" });
    const inFuture = await post(sensor.id, { value: 10, timestamp: future });

    expect(missing.status).toBe(400);
    expect(missing.body.details.map((i: { field: string }) => i.field)).toEqual([
      "value",
      "timestamp",
    ]);
    expect(badDate.status).toBe(400);
    expect(inFuture.status).toBe(400);
    expect(inFuture.body.details[0].message).toBe("timestamp cannot be in the future");
  });

  it("responds 401 without a token", async () => {
    const sensor = await createSensor();

    const res = await request(app)
      .post(`/api/sensors/${sensor.id}/readings`)
      .send({ value: 10, timestamp });

    expect(res.status).toBe(401);
  });
});

describe("GET /api/readings/:id", () => {
  it("returns one reading with its sensor", async () => {
    const sensor = await createSensor();
    const created = await post(sensor.id, { value: 10, timestamp });

    const res = await request(app)
      .get(created.headers.location as string)
      .set("Authorization", auth);

    expect(res.status).toBe(200);
    expect(res.body.data.reading).toMatchObject({ value: 10, sensor: { id: sensor.id } });
  });

  it("responds 404 for a reading that does not exist", async () => {
    const res = await request(app)
      .get(`/api/readings/${new Types.ObjectId().toString()}`)
      .set("Authorization", auth);

    expect(res.status).toBe(404);
  });
});
