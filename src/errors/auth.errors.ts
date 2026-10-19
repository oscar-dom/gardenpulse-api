import { AppError } from "./app.error.js";

// Authentication and authorization errors. Each one has its own name, so a client can
// tell them apart by the `error` field of the response.

/** 401: the request carries no Bearer token. */
export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required. Send a Bearer token.") {
    super(message, 401);
    this.name = "Unauthorized";
  }
}

/** 401: the token is forged, expired or points to a user that no longer exists. */
export class InvalidTokenError extends AppError {
  constructor(message = "The token is not valid.") {
    super(message, 401);
    this.name = "InvalidToken";
  }
}

/** 401: wrong email or password (the same error for both). */
export class InvalidCredentialsError extends AppError {
  constructor() {
    super("Invalid email or password.", 401);
    this.name = "InvalidCredentials";
  }
}

/** 403: the user is identified, but their role is not allowed. */
export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action.") {
    super(message, 403);
    this.name = "Forbidden";
  }
}

/** 409: the email of a sign-up is already taken. */
export class EmailAlreadyRegisteredError extends AppError {
  constructor() {
    super("Email is already registered.", 409);
    this.name = "EmailAlreadyRegistered";
  }
}
