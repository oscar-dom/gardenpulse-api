import { z } from "zod";
import { SENSOR_TYPES, THRESHOLD_DIRECTIONS } from "../models/sensor.model.js";
import { booleanQuerySchema, paginationQuerySchema } from "./common.schema.js";

export const sensorTypeSchema = z.enum(SENSOR_TYPES, {
  error: `type must be one of: ${SENSOR_TYPES.join(", ")}`,
});

export const listSensorsQuerySchema = paginationQuerySchema.extend({
  type: sensorTypeSchema.optional(),
  active: booleanQuerySchema("active").optional(),
});

export type ListSensorsQuery = z.infer<typeof listSensorsQuerySchema>;

// `unit` is not accepted: the server derives it from `type`. Unknown fields are
// dropped, as in the rest of the API.
export const createSensorSchema = z.object({
  name: z
    .string({ error: "name is required" })
    .trim()
    .min(1, "name is required")
    .max(100, "name must have at most 100 characters"),
  type: sensorTypeSchema,
  location: z
    .string({ error: "location is required" })
    .trim()
    .min(1, "location is required")
    .max(100, "location must have at most 100 characters"),
  threshold: z.number({ error: "threshold must be a number" }),
  thresholdDirection: z
    .enum(THRESHOLD_DIRECTIONS, {
      error: `thresholdDirection must be one of: ${THRESHOLD_DIRECTIONS.join(", ")}`,
    })
    .optional(),
  active: z.boolean({ error: "active must be a boolean" }).optional(),
});

export type CreateSensorInput = z.infer<typeof createSensorSchema>;
