import { Error as MongooseError } from "mongoose";
import { type Sensor, SensorModel } from "../../src/models/sensor.model.js";
import { useTestDatabase } from "./helpers/db.js";

useTestDatabase();

const validSensor = {
  name: "  Tomato bed moisture  ",
  type: "soil_moisture",
  location: "Bed 3",
  threshold: 30,
} as const;

describe("Sensor model", () => {
  it("saves a valid sensor with defaults and a derived unit", async () => {
    const sensor = await SensorModel.create(validSensor);

    expect(sensor.name).toBe("Tomato bed moisture"); // trimmed
    expect(sensor.unit).toBe("%");
    expect(sensor.thresholdDirection).toBe("above");
    expect(sensor.active).toBe(true);
    expect(sensor.createdAt).toBeInstanceOf(Date);
  });

  it("ignores a unit sent by the client and derives it from the type", async () => {
    const sensor = await SensorModel.create({
      ...validSensor,
      type: "temperature",
      unit: "lux",
    });

    expect(sensor.unit).toBe("°C");
  });

  it("rejects a sensor without required fields", async () => {
    const error = await SensorModel.create({}).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(MongooseError.ValidationError);
    const { errors } = error as MongooseError.ValidationError;
    expect(Object.keys(errors)).toEqual(
      expect.arrayContaining(["name", "type", "location", "threshold"]),
    );
  });

  it("rejects an unknown type and threshold direction", async () => {
    // Invalid on purpose: the type system would reject these values at compile time.
    const invalid = {
      ...validSensor,
      type: "wind",
      thresholdDirection: "sideways",
    } as unknown as Partial<Sensor>;

    const error = await SensorModel.create(invalid).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(MongooseError.ValidationError);
    const { errors } = error as MongooseError.ValidationError;
    expect(errors.type?.message).toBe(
      "type must be one of: soil_moisture, temperature, light, air_humidity",
    );
    expect(errors.thresholdDirection).toBeDefined();
  });

  it("serializes to JSON with id and without _id or __v", async () => {
    const sensor = await SensorModel.create(validSensor);
    // Mongoose types toJSON() as the raw document; the transform reshapes it.
    const json = sensor.toJSON() as unknown as Record<string, unknown>;

    expect(json.id).toBe(sensor._id.toString());
    expect(json).not.toHaveProperty("_id");
    expect(json).not.toHaveProperty("__v");
  });
});
