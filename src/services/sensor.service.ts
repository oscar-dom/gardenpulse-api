import { AppError } from "../errors/app.error.js";
import { type Sensor, SensorModel } from "../models/sensor.model.js";
import type { ListSensorsQuery } from "../schemas/sensor.schema.js";
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
