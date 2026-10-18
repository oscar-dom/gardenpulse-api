import { Error as MongooseError, Types } from "mongoose";
import { ReadingModel } from "../../src/models/reading.model.js";
import { isAnomalous } from "../../src/services/anomaly.service.js";
import { useTestDatabase } from "./helpers/db.js";

useTestDatabase();

describe("isAnomalous", () => {
  it("flags values above the threshold when the direction is above", () => {
    const rule = { threshold: 30, thresholdDirection: "above" } as const;

    expect(isAnomalous(31, rule)).toBe(true);
    expect(isAnomalous(30, rule)).toBe(false); // equal is normal
    expect(isAnomalous(29, rule)).toBe(false);
  });

  it("flags values below the threshold when the direction is below", () => {
    const rule = { threshold: 30, thresholdDirection: "below" } as const;

    expect(isAnomalous(29, rule)).toBe(true);
    expect(isAnomalous(30, rule)).toBe(false); // equal is normal
    expect(isAnomalous(31, rule)).toBe(false);
  });
});

describe("Reading model", () => {
  const validReading = () => ({
    sensor: new Types.ObjectId(),
    value: 25.5,
    timestamp: new Date("2026-10-18T10:00:00Z"),
    anomalous: false,
  });

  it("saves a valid reading", async () => {
    const reading = await ReadingModel.create(validReading());

    expect(reading.value).toBe(25.5);
    expect(reading.timestamp.toISOString()).toBe("2026-10-18T10:00:00.000Z");
    expect(reading.createdAt).toBeInstanceOf(Date);
  });

  it("rejects a reading without required fields", async () => {
    const error = await ReadingModel.create({}).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(MongooseError.ValidationError);
    const { errors } = error as MongooseError.ValidationError;
    expect(Object.keys(errors)).toEqual(
      expect.arrayContaining(["sensor", "value", "timestamp", "anomalous"]),
    );
  });

  it("serializes to JSON with id and without _id or __v", async () => {
    const reading = await ReadingModel.create(validReading());
    // Mongoose types toJSON() as the raw document; the transform reshapes it.
    const json = reading.toJSON() as unknown as Record<string, unknown>;

    expect(json.id).toBe(reading._id.toString());
    expect(json).not.toHaveProperty("_id");
    expect(json).not.toHaveProperty("__v");
  });
});
