import { type Sensor, SensorModel } from "../../../src/models/sensor.model.js";

let counter = 0;

/** Creates a sensor straight in the database with sensible defaults. */
export const createSensor = (overrides: Partial<Sensor> = {}) => {
  counter += 1;
  return SensorModel.create({
    name: `Sensor ${String(counter).padStart(3, "0")}`,
    type: "soil_moisture",
    location: "Bed 1",
    threshold: 30,
    ...overrides,
  });
};
