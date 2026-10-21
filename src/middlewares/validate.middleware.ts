import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodType } from "zod";
import { ValidationError } from "../errors/app.error.js";

type Location = "body" | "params" | "query";

/**
 * Validates and parses one part of the request. On success the parsed value (trimmed,
 * coerced, with defaults) replaces the raw one; on failure it reports every invalid
 * field of that part at once as a 400 ValidationError.
 */
const validateRequest =
  (location: Location) =>
  (schema: ZodType): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[location]);
    if (!result.success) {
      next(
        new ValidationError(
          result.error.issues.map((issue) => ({
            location,
            field: issue.path.map(String).join("."),
            message: issue.message,
          })),
        ),
      );
      return;
    }

    if (location === "query") {
      // Express 5 exposes req.query through a getter, so it cannot be assigned:
      // shadow it with an own property holding the parsed value instead.
      Object.defineProperty(req, "query", {
        value: result.data,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    } else {
      req[location] = result.data as Request[typeof location];
    }
    next();
  };

export const validateBody = validateRequest("body");
export const validateQuery = validateRequest("query");
export const validateParams = validateRequest("params");
