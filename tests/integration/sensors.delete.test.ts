import { Types } from "mongoose";
import request from "supertest";
import { app } from "../../src/app.js";
import { ReadingModel } from "../../src/models/reading.model.js";
import { SensorModel } from "../../src/models/sensor.model.js";
import { createUserWithToken } from "./helpers/auth.js";
import { useTestDatabase } from "./helpers/db.js";
import { createSensor } from "./helpers/factories.js";

useTestDatabase();

let adminAuth: string;

beforeEach(async () => {
  ({ auth: adminAuth } = await createUserWithToken("admin"));
});

const del = (url: string, auth = adminAuth) => request(app).delete(url).set("Authorization", auth);

const addReading = (sensor: Types.ObjectId) =>
  ReadingModel.create({ sensor, value: 10, timestamp: new Date(), anomalous: false });

describe("DELETE /api/sensors/:id", () => {
  it("deletes a sensor without readings with 204 and no body", async () => {
    const sensor = await createSensor();

    const res = await del(`/api/sensors/${sensor.id}`);

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
    expect(await SensorModel.exists({ _id: sensor._id })).toBeNull();
  });

  it("responds 409 for a sensor with readings and keeps everything", async () => {
    const sensor = await createSensor();
    await addReading(sensor._id);

    const res = await del(`/api/sensors/${sensor.id}`);

    expect(res.status).toBe(409);
    expect(res.body.message).toContain("?cascade=true");
    expect(await SensorModel.exists({ _id: sensor._id })).not.toBeNull();
    expect(await ReadingModel.countDocuments({ sensor: sensor._id })).toBe(1);
  });

  it("deletes the sensor and only its readings with cascade=true", async () => {
    const sensor = await createSensor();
    const other = await createSensor();
    await addReading(sensor._id);
    await addReading(sensor._id);
    await addReading(other._id);

    const res = await del(`/api/sensors/${sensor.id}?cascade=true`);

    expect(res.status).toBe(204);
    expect(await SensorModel.exists({ _id: sensor._id })).toBeNull();
    expect(await ReadingModel.countDocuments({ sensor: sensor._id })).toBe(0);
    expect(await ReadingModel.countDocuments({ sensor: other._id })).toBe(1);
  });

  it("responds 404 for a sensor that does not exist", async () => {
    const res = await del(`/api/sensors/${new Types.ObjectId().toString()}`);

    expect(res.status).toBe(404);
  });

  it("responds 400 for an invalid cascade value", async () => {
    const sensor = await createSensor();

    const res = await del(`/api/sensors/${sensor.id}?cascade=yes`);

    expect(res.status).toBe(400);
    expect(res.body.details[0]).toMatchObject({ location: "query", field: "cascade" });
  });

  it("responds 403 to a regular user and keeps the sensor", async () => {
    const sensor = await createSensor();
    const { auth } = await createUserWithToken("user");

    const res = await del(`/api/sensors/${sensor.id}`, auth);

    expect(res.status).toBe(403);
    expect(await SensorModel.exists({ _id: sensor._id })).not.toBeNull();
  });
});
