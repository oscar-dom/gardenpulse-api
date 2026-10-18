import { AppError } from "../errors/app.error.js";
import { ReadingModel } from "../models/reading.model.js";
import type { CreateReadingInput } from "../schemas/reading.schema.js";
import { isAnomalous } from "./anomaly.service.js";
import { getSensorById } from "./sensor.service.js";

// Sensor fields shown with each reading: enough to read it without a second request.
export const SENSOR_SUMMARY_FIELDS = "name type unit location";

/**
 * Stores a reading for an existing, active sensor. The server decides whether it is
 * anomalous from the sensor's threshold; the client never sends that flag.
 */
export const createReading = async (sensorId: string, { value, timestamp }: CreateReadingInput) => {
  const sensor = await getSensorById(sensorId); // 404 if it does not exist
  if (!sensor.active) {
    throw new AppError("The sensor is inactive and does not accept new readings.", 409);
  }

  const reading = await ReadingModel.create({
    sensor: sensor._id,
    value,
    timestamp,
    anomalous: isAnomalous(value, sensor),
  });
  return reading.populate("sensor", SENSOR_SUMMARY_FIELDS);
};

export const getReadingById = async (id: string) => {
  const reading = await ReadingModel.findById(id).populate("sensor", SENSOR_SUMMARY_FIELDS);
  if (!reading) throw new AppError("Reading not found.", 404);
  return reading;
};
