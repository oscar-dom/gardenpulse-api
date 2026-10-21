const ERROR_NAMES: Record<number, string> = {
  400: "BadRequest",
  401: "Unauthorized",
  403: "Forbidden",
  404: "NotFound",
  409: "Conflict",
  500: "InternalServerError",
};

/**
 * Expected error with a known HTTP status. Throw it from services and controllers;
 * the global error handler turns it into a JSON response.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  // Operational errors are expected situations (bad input, missing resource), not bugs.
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 400, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = ERROR_NAMES[statusCode] ?? "Error";

    // Keeps `instanceof AppError` reliable for subclasses.
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export interface ValidationIssue {
  location: "body" | "params" | "query";
  field: string;
  message: string;
}

/** Client input that does not match the expected schema (400). */
export class ValidationError extends AppError {
  public readonly details: ValidationIssue[];

  constructor(details: ValidationIssue[]) {
    super("The request data is not valid.", 400);
    this.name = "ValidationError";
    this.details = details;
  }
}
