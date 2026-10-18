import request from "supertest";
import { app } from "../../src/app.js";
import { SensorModel } from "../../src/models/sensor.model.js";
import { createUserWithToken } from "./helpers/auth.js";
import { useTestDatabase } from "./helpers/db.js";

useTestDatabase();

const newSensor = {
  name: "  Tomato bed moisture ",
  type: "soil_moisture",
  location: "Bed 3",
  threshold: 25,
  thresholdDirection: "below",
};

const post = (auth: string, body: object) =>
  request(app).post("/api/sensors").set("Authorization", auth).send(body);

describe("POST /api/sensors", () => {
  it("lets an admin create a sensor and points to it with Location", async () => {
    const { auth } = await createUserWithToken("admin");

    const res = await post(auth, newSensor);

    expect(res.status).toBe(201);
    expect(res.body.data.sensor).toMatchObject({
      name: "Tomato bed moisture",
      type: "soil_moisture",
      unit: "%",
      location: "Bed 3",
      threshold: 25,
      thresholdDirection: "below",
      active: true,
    });
    expect(res.headers.location).toBe(`/api/sensors/${res.body.data.sensor.id}`);
  });

  it("derives the unit from the type and ignores one sent by the client", async () => {
    const { auth } = await createUserWithToken("admin");

    const res = await post(auth, { ...newSensor, type: "light", unit: "°C" });

    expect(res.status).toBe(201);
    expect(res.body.data.sensor.unit).toBe("lux");
  });

  it("responds 403 to a regular user and creates nothing", async () => {
    const { auth } = await createUserWithToken("user");

    const res = await post(auth, newSensor);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Forbidden");
    expect(await SensorModel.countDocuments()).toBe(0);
  });

  it("responds 401 without a token", async () => {
    const res = await request(app).post("/api/sensors").send(newSensor);

    expect(res.status).toBe(401);
  });

  it("responds 400 with every invalid field", async () => {
    const { auth } = await createUserWithToken("admin");

    const res = await post(auth, {
      name: "",
      type: "wind",
      threshold: "high",
      thresholdDirection: "sideways",
      active: "yes",
    });

    expect(res.status).toBe(400);
    const fields = res.body.details.map((issue: { field: string }) => issue.field);
    expect(fields).toEqual([
      "name",
      "type",
      "location",
      "threshold",
      "thresholdDirection",
      "active",
    ]);
  });
});
