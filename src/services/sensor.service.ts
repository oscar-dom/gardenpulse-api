import { AppError } from "../errors/app.error.js";
import { ReadingModel } from "../models/reading.model.js";
import { type Sensor, SensorModel } from "../models/sensor.model.js";
import type {
  CreateSensorInput,
  DeleteSensorQuery,
  ListSensorsQuery,
  UpdateSensorInput,
} from "../schemas/sensor.schema.js";
import { recalculateAnomalies } from "./anomaly.service.js";
import { buildPaginationMeta, skipFor } from "./pagination.service.js";

/** One page of the sensor catalog, optionally filtered by type and status. */
export const listSensors = async ({ page, limit, type, active }: ListSensorsQuery) => {
  const filter: Partial<Pick<Sensor, "type" | "active">> = {};
  if (type) filter.type = type;
  if (active !== undefined) filter.active = active;

  const [sensors, total] = await Promise.all([
    SensorModel.find(filter).sort({ name: 1, _id: 1 }).skip(skipFor({ page, limit })).limit(limit),
    SensorModel.countDocuments(filter),
  ]);

  return { sensors, meta: buildPaginationMeta({ page, limit }, total) };
};

export const getSensorById = async (id: string) => {
  const sensor = await SensorModel.findById(id);
  if (!sensor) throw new AppError("Sensor not found.", 404);
  return sensor;
};

export const createSensor = (input: CreateSensorInput) => SensorModel.create(input);

/**
 * Applies a partial update. Changing the type is only allowed while the sensor has
 * no readings: it changes the unit, and old values would become meaningless. When
 * the threshold or its direction changes, existing readings are re-evaluated.
 */
export const updateSensor = async (id: string, changes: UpdateSensorInput) => {
  const sensor = await getSensorById(id);

  if (changes.type && changes.type !== sensor.type) {
    const hasReadings = await ReadingModel.exists({ sensor: sensor._id });
    if (hasReadings) {
      throw new AppError(
        "The type of a sensor with readings cannot change. Create a new sensor instead.",
        409,
      );
    }
  }

  const ruleChanged =
    (changes.threshold !== undefined && changes.threshold !== sensor.threshold) ||
    (changes.thresholdDirection !== undefined &&
      changes.thresholdDirection !== sensor.thresholdDirection);

  sensor.set(changes);
  await sensor.save();

  if (ruleChanged) await recalculateAnomalies(sensor._id, sensor);
  return sensor;
};

/**
 * Deletes a sensor. If it has readings, the admin must choose: keep the history by
 * deactivating the sensor (PATCH active: false), or delete everything with
 * cascade. Readings are never left pointing to a sensor that no longer exists.
 */
export const deleteSensor = async (id: string, { cascade }: DeleteSensorQuery) => {
  const sensor = await getSensorById(id);

  const readingCount = await ReadingModel.countDocuments({ sensor: sensor._id });
  if (readingCount > 0 && !cascade) {
    throw new AppError(
      `The sensor has ${readingCount} reading(s). Deactivate it to keep them ` +
        "(PATCH active: false), or delete it with ?cascade=true to remove them too.",
      409,
    );
  }

  await ReadingModel.deleteMany({ sensor: sensor._id });
  await sensor.deleteOne();
};
