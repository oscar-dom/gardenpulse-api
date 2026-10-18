import { z } from "zod";

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
