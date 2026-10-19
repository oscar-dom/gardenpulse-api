import { type QueryFilter, Types } from "mongoose";
import { AppError } from "../errors/app.error.js";
import { type Reading, ReadingModel } from "../models/reading.model.js";
import { SensorModel } from "../models/sensor.model.js";
import type { CreateReadingInput, ListReadingsQuery } from "../schemas/reading.schema.js";
import { isAnomalous } from "./anomaly.service.js";
import { buildPaginationMeta, skipFor } from "./pagination.service.js";
import { getSensorById } from "./sensors.service.js";

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

/**
 * One page of the reading history. Filters by sensor, sensor type, anomaly and date
 * range can be combined with each other, with sorting and with pagination.
 */
export const listReadings = async (query: ListReadingsQuery) => {
  const { page, limit, sensor, type, anomalous, from, to, sort } = query;
  const conditions: QueryFilter<Reading>[] = [];

  if (sensor) conditions.push({ sensor: new Types.ObjectId(sensor) });
  // The type belongs to the sensor (it is not copied into readings), so look up
  // the sensors of that type first.
  if (type) {
    const sensorIds = await SensorModel.find({ type }).distinct("_id");
    conditions.push({ sensor: { $in: sensorIds } });
  }
  if (anomalous !== undefined) conditions.push({ anomalous });
  if (from || to) {
    conditions.push({ timestamp: { ...(from && { $gte: from }), ...(to && { $lte: to }) } });
  }

  const filter: QueryFilter<Reading> = conditions.length > 0 ? { $and: conditions } : {};
  const field = sort.replace("-", "") as "timestamp" | "value";
  const direction = sort.startsWith("-") ? -1 : 1;

  const [readings, total] = await Promise.all([
    ReadingModel.find(filter)
      // _id breaks ties so pages never repeat or skip readings with equal values.
      .sort({ [field]: direction, _id: direction })
      .skip(skipFor({ page, limit }))
      .limit(limit)
      .populate("sensor", SENSOR_SUMMARY_FIELDS),
    ReadingModel.countDocuments(filter),
  ]);

  return { readings, meta: buildPaginationMeta({ page, limit }, total) };
};
