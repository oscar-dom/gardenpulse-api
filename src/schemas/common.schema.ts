import { z } from "zod";

// A MongoDB id: 24 hexadecimal characters. Checked up front so a malformed id is a
// 400 instead of a database cast error.
export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "id must be a valid identifier (24 hexadecimal characters)");

export const idParamsSchema = z.object({ id: objectIdSchema });
