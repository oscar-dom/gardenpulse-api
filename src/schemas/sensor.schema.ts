import { z } from "zod";
import { SENSOR_TYPES } from "../models/sensor.model.js";
import { booleanQuerySchema, paginationQuerySchema } from "./common.schema.js";

export const sensorTypeSchema = z.enum(SENSOR_TYPES, {
  error: `type must be one of: ${SENSOR_TYPES.join(", ")}`,
});

export const listSensorsQuerySchema = paginationQuerySchema.extend({
  type: sensorTypeSchema.optional(),
  active: booleanQuerySchema("active").optional(),
});

export type ListSensorsQuery = z.infer<typeof listSensorsQuerySchema>;
