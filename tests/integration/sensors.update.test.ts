import { Types } from "mongoose";
import request from "supertest";
import { app } from "../../src/app.js";
import { ReadingModel } from "../../src/models/reading.model.js";
import { isAnomalous } from "../../src/services/anomaly.service.js";
import { createUserWithToken } from "./helpers/auth.js";
import { useTestDatabase } from "./helpers/db.js";
import { createSensor } from "./helpers/factories.js";

useTestDatabase();

let adminAuth: string;

beforeEach(async () => {
  ({ auth: adminAuth } = await createUserWithToken("admin"));
});

const patch = (id: string, body: object, auth = adminAuth) =>
  request(app).patch(`/api/sensors/${id}`).set("Authorization", auth).send(body);

const addReadings = (sensor: Types.ObjectId, values: number[], anomalous = false) =>
  ReadingModel.insertMany(
    values.map((value) => ({ sensor, value, timestamp: new Date(), anomalous })),
  );

describe("PATCH /api/sensors/:id", () => {
  it("updates only the fields sent", async () => {
    const sensor = await createSensor({ name: "Old name", location: "Bed 1" });

    const res = await patch(sensor.id, { name: " New name ", active: false });

    expect(res.status).toBe(200);
    expect(res.body.data.sensor).toMatchObject({
      name: "New name",
      location: "Bed 1",
      active: false,
    });
  });

  it("updates the unit when the type changes on a sensor without readings", async () => {
    const sensor = await createSensor({ type: "soil_moisture" });

    const res = await patch(sensor.id, { type: "temperature" });

    expect(res.status).toBe(200);
    expect(res.body.data.sensor).toMatchObject({ type: "temperature", unit: "°C" });
  });

  it("responds 409 when changing the type of a sensor with readings", async () => {
    const sensor = await createSensor({ type: "soil_moisture" });
    await addReadings(sensor._id, [10]);

    const res = await patch(sensor.id, { type: "temperature" });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Conflict");
  });

  it("recalculates the anomaly flag of existing readings when the rule changes", async () => {
    const sensor = await createSensor({ threshold: 30, thresholdDirection: "above" });
    const other = await createSensor();
    await addReadings(sensor._id, [10, 20, 25, 40]);
    await addReadings(other._id, [10], true);

    const res = await patch(sensor.id, { threshold: 20, thresholdDirection: "below" });

    expect(res.status).toBe(200);
    const readings = await ReadingModel.find({ sensor: sensor._id }).sort({ value: 1 });
    const rule = { threshold: 20, thresholdDirection: "below" } as const;
    // The database update must agree with isAnomalous: only 10 is below 20.
    expect(readings.map((r) => r.anomalous)).toEqual(
      readings.map((r) => isAnomalous(r.value, rule)),
    );
    expect(readings.map((r) => r.anomalous)).toEqual([true, false, false, false]);
    // Readings of other sensors are untouched.
    expect((await ReadingModel.findOne({ sensor: other._id }).orFail()).anomalous).toBe(true);
  });

  it("responds 400 for an empty body or invalid values", async () => {
    const sensor = await createSensor();

    const empty = await patch(sensor.id, {});
    const invalid = await patch(sensor.id, { threshold: "high", name: "" });

    expect(empty.status).toBe(400);
    expect(empty.body.details[0].message).toBe("send at least one field to update");
    expect(invalid.status).toBe(400);
    const fields = invalid.body.details.map((issue: { field: string }) => issue.field);
    expect(fields).toEqual(["name", "threshold"]);
  });

  it("responds 404 for a sensor that does not exist", async () => {
    const res = await patch(new Types.ObjectId().toString(), { name: "Ghost" });

    expect(res.status).toBe(404);
  });

  it("responds 403 to a regular user and changes nothing", async () => {
    const sensor = await createSensor({ name: "Original" });
    const { auth } = await createUserWithToken("user");

    const res = await patch(sensor.id, { name: "Hacked" }, auth);

    expect(res.status).toBe(403);
    const get = await request(app).get(`/api/sensors/${sensor.id}`).set("Authorization", auth);
    expect(get.body.data.sensor.name).toBe("Original");
  });
});
