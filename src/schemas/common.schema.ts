import { z } from "zod";

// A MongoDB id: 24 hexadecimal characters. Checked up front so a malformed id is a
// 400 instead of a database cast error.
export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "id must be a valid identifier (24 hexadecimal characters)");

export const idParamsSchema = z.object({ id: objectIdSchema });

export const MAX_PAGE_SIZE = 100;

// Query strings are always text, so numbers are coerced before checking them.
export const paginationQuerySchema = z.object({
  page: z.coerce
    .number("page must be a number")
    .int("page must be a whole number")
    .min(1, "page must be at least 1")
    .default(1),
  limit: z.coerce
    .number("limit must be a number")
    .int("limit must be a whole number")
    .min(1, "limit must be at least 1")
    .max(MAX_PAGE_SIZE, `limit must be at most ${MAX_PAGE_SIZE}`)
    .default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

// "true"/"false" in the query string. z.coerce.boolean() would turn "false" into true.
export const booleanQuerySchema = (field: string) =>
  z
    .enum(["true", "false"], { error: `${field} must be true or false` })
    .transform((value) => value === "true");
