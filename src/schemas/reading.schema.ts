import { z } from "zod";
import { booleanQuerySchema, objectIdSchema, paginationQuerySchema } from "./common.schema.js";
import { sensorTypeSchema } from "./sensor.schema.js";

// Readings may arrive a little late, but never from the future. A small margin
// absorbs clock differences between the device and the server.
const CLOCK_SKEW_MS = 5 * 60 * 1000;

// `anomalous` is not accepted: the server decides it. Unknown fields are dropped.
export const createReadingSchema = z.object({
  value: z.number({ error: "value must be a number" }),
  timestamp: z.iso
    .datetime({
      offset: true,
      error: "timestamp must be an ISO 8601 date-time, e.g. 2026-10-18T10:00:00Z",
    })
    .transform((value) => new Date(value))
    .refine((date) => date.getTime() <= Date.now() + CLOCK_SKEW_MS, {
      error: "timestamp cannot be in the future",
    }),
});

export type CreateReadingInput = z.infer<typeof createReadingSchema>;

// "-field" sorts descending. Newest first by default.
export const READING_SORTS = ["-timestamp", "timestamp", "-value", "value"] as const;

const dateQuery = (field: string) =>
  z.iso
    .datetime({ offset: true, error: `${field} must be an ISO 8601 date-time` })
    .transform((value) => new Date(value));

// Every filter is optional and they can all be combined with pagination and sorting.
export const listReadingsQuerySchema = paginationQuerySchema
  .extend({
    sensor: objectIdSchema.optional(),
    type: sensorTypeSchema.optional(),
    anomalous: booleanQuerySchema("anomalous").optional(),
    from: dateQuery("from").optional(),
    to: dateQuery("to").optional(),
    sort: z
      .enum(READING_SORTS, { error: `sort must be one of: ${READING_SORTS.join(", ")}` })
      .default("-timestamp"),
  })
  .refine(({ from, to }) => !from || !to || from <= to, {
    error: "from must be before to",
    path: ["from"],
  });

export type ListReadingsQuery = z.infer<typeof listReadingsQuerySchema>;
