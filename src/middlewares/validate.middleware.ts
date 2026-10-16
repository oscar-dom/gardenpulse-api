import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { ValidationError, type ValidationIssue } from "../errors/app.error.js";

interface RequestSchemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

type Location = keyof RequestSchemas;
const LOCATIONS: Location[] = ["params", "query", "body"];

/**
 * Validates and parses the request parts that have a schema. On success the parsed
 * values (trimmed, coerced, with defaults) replace the raw ones; on failure it reports
 * every invalid field at once as a 400 ValidationError.
 */
export const validate =
  (schemas: RequestSchemas) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const issues: ValidationIssue[] = [];
    const parsed: Partial<Record<Location, unknown>> = {};

    for (const location of LOCATIONS) {
      const schema = schemas[location];
      if (!schema) continue;

      const result = schema.safeParse(req[location]);
      if (result.success) {
        parsed[location] = result.data;
      } else {
        for (const issue of result.error.issues) {
          issues.push({
            location,
            field: issue.path.map(String).join("."),
            message: issue.message,
          });
        }
      }
    }

    if (issues.length > 0) {
      next(new ValidationError(issues));
      return;
    }

    if ("body" in parsed) req.body = parsed.body;
    if ("params" in parsed) req.params = parsed.params as Request["params"];
    // Express 5 exposes req.query through a getter, so it cannot be assigned:
    // shadow it with an own property holding the parsed value instead.
    if ("query" in parsed) {
      Object.defineProperty(req, "query", {
        value: parsed.query,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }

    next();
  };
