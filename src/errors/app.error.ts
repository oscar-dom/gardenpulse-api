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

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = ERROR_NAMES[statusCode] ?? "Error";

    // Keeps `instanceof AppError` reliable for subclasses.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
