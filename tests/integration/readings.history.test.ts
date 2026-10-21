import request from "supertest";
import { app } from "../../src/app.js";
import { ReadingModel } from "../../src/models/reading.model.js";
import { createUserWithToken } from "./helpers/auth.js";
import { useTestDatabase } from "./helpers/db.js";
import { createSensor } from "./helpers/factories.js";

useTestDatabase();

let auth: string;
let moistureId: string;
let temperatureId: string;

const at = (hour: number) => new Date(Date.UTC(2026, 9, 18, hour));

// Fixture: 2 sensors, 6 readings at different hours.
//   moisture    (threshold 30 above): 10@01, 40@03 (anomalous), 50@05 (anomalous)
//   temperature (threshold 35 above): 20@02, 36@04 (anomalous), 30@06
beforeEach(async () => {
  ({ auth } = await createUserWithToken("user"));
  const moisture = await createSensor({ type: "soil_moisture", threshold: 30 });
  const temperature = await createSensor({ type: "temperature", threshold: 35 });
  moistureId = moisture.id;
  temperatureId = temperature.id;

  const rows: [string, number, number, boolean][] = [
    [moistureId, 10, 1, false],
    [temperatureId, 20, 2, false],
    [moistureId, 40, 3, true],
    [temperatureId, 36, 4, true],
    [moistureId, 50, 5, true],
    [temperatureId, 30, 6, false],
  ];
  await ReadingModel.insertMany(
    rows.map(([sensor, value, hour, anomalous]) => ({
      sensor,
      value,
      timestamp: at(hour),
      anomalous,
    })),
  );
});

const list = (query = "") => request(app).get(`/api/readings${query}`).set("Authorization", auth);
const values = (res: request.Response) =>
  res.body.data.readings.map((r: { value: number }) => r.value);

describe("GET /api/readings", () => {
  it("returns the newest readings first with their sensor and unit", async () => {
    const res = await list();

    expect(res.status).toBe(200);
    expect(values(res)).toEqual([30, 50, 36, 40, 20, 10]);
    expect(res.body.data.readings[0]).toMatchObject({
      unit: "°C",
      sensor: { id: temperatureId, type: "temperature" },
    });
    expect(res.body.meta).toMatchObject({ total: 6, page: 1, limit: 10, totalPages: 1 });
  });

  it("filters by sensor", async () => {
    const res = await list(`?sensor=${moistureId}`);

    expect(values(res)).toEqual([50, 40, 10]);
  });

  it("filters by sensor type", async () => {
    const res = await list("?type=temperature");

    expect(values(res)).toEqual([30, 36, 20]);
  });

  it("filters by anomaly", async () => {
    const anomalous = await list("?anomalous=true");
    const normal = await list("?anomalous=false");

    expect(values(anomalous)).toEqual([50, 36, 40]);
    expect(values(normal)).toEqual([30, 20, 10]);
  });

  it("filters by date range", async () => {
    const res = await list(`?from=${at(2).toISOString()}&to=${at(4).toISOString()}`);

    expect(values(res)).toEqual([36, 40, 20]);
  });

  it("sorts by date or value in both directions", async () => {
    expect(values(await list("?sort=timestamp"))).toEqual([10, 20, 40, 36, 50, 30]);
    expect(values(await list("?sort=value"))).toEqual([10, 20, 30, 36, 40, 50]);
    expect(values(await list("?sort=-value"))).toEqual([50, 40, 36, 30, 20, 10]);
  });

  it("combines pagination, filters and sorting in one query", async () => {
    const page1 = await list("?anomalous=true&sort=value&limit=2&page=1");
    const page2 = await list("?anomalous=true&sort=value&limit=2&page=2");

    expect(values(page1)).toEqual([36, 40]);
    expect(page1.body.meta).toEqual({
      total: 3,
      page: 1,
      limit: 2,
      totalPages: 2,
      hasNextPage: true,
      hasPrevPage: false,
      // The links keep the filters and sorting of the request.
      next: "?anomalous=true&sort=value&limit=2&page=2",
      prev: null,
    });
    expect(values(page2)).toEqual([50]);
    expect(page2.body.meta).toMatchObject({
      page: 2,
      hasNextPage: false,
      hasPrevPage: true,
      next: null,
      prev: "?anomalous=true&sort=value&limit=2&page=1",
    });
  });

  it("returns an empty page when the sensor and type do not match", async () => {
    const res = await list(`?sensor=${moistureId}&type=temperature`);

    expect(res.status).toBe(200);
    expect(res.body.data.readings).toEqual([]);
    // An empty list is still one page, so there is no link to a page 0.
    expect(res.body.meta).toMatchObject({
      total: 0,
      totalPages: 1,
      hasNextPage: false,
      next: null,
    });
  });

  it("responds 400 for invalid query parameters", async () => {
    const res = await list(
      "?sensor=abc&type=wind&anomalous=maybe&sort=name&from=yesterday&limit=0",
    );

    expect(res.status).toBe(400);
    const fields = res.body.details.map((issue: { field: string }) => issue.field);
    expect(fields).toEqual(
      expect.arrayContaining(["sensor", "type", "anomalous", "sort", "from", "limit"]),
    );
  });

  it("responds 400 when from is after to", async () => {
    const res = await list(`?from=${at(5).toISOString()}&to=${at(1).toISOString()}`);

    expect(res.status).toBe(400);
    expect(res.body.details[0]).toMatchObject({ field: "from", message: "from must be before to" });
  });

  it("responds 401 without a token", async () => {
    const res = await request(app).get("/api/readings");

    expect(res.status).toBe(401);
  });
});
