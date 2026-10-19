import type { ErrorRequestHandler, Request, Response } from "express";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { AppError, ValidationError } from "../errors/app.error.js";

// Catches any request that did not match a route.
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    status: "fail",
    error: "NotFound",
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

// Turns every error into the same JSON shape. Must be registered last.
export const globalErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ValidationError) {
    res.status(400).json({
      status: "fail",
      error: err.name,
      message: err.message,
      details: err.details,
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: err.statusCode >= 500 ? "error" : "fail",
      error: err.name,
      message: err.message,
    });
    return;
  }

  // express.json() rejects a body that is not valid JSON.
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({
      status: "fail",
      error: "InvalidJSON",
      message: "The request body is not valid JSON.",
    });
    return;
  }

  // Unexpected error: log it. Only in development does the response show the stack
  // trace, to help debugging; elsewhere internals never reach the client.
  logger.error({ err }, "Unhandled error");
  res.status(500).json({
    status: "error",
    error: "InternalServerError",
    message: "An unexpected error occurred.",
    ...(env.NODE_ENV === "development" && { stack: (err as Error)?.stack }),
  });
};
