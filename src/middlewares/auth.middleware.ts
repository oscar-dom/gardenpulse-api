import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { isValidObjectId } from "mongoose";
import { AppError } from "../errors/app.error.js";
import { type UserRole, UserModel } from "../models/user.model.js";
import { verifyToken } from "../services/token.service.js";

/**
 * 401 when the request does not prove who the user is: no token, a forged or expired
 * one, or a user that no longer exists. Otherwise loads the user into `req.user`.
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const [scheme, token] = req.headers.authorization?.split(" ") ?? [];
  if (scheme !== "Bearer" || !token) {
    throw new AppError("Authentication required. Send a Bearer token.", 401);
  }

  let userId: string;
  try {
    userId = verifyToken(token).sub;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError("The token has expired. Log in again.", 401);
    }
    throw new AppError("The token is not valid.", 401);
  }

  // Loaded on every request so role changes and deleted accounts apply at once.
  const user = isValidObjectId(userId) ? await UserModel.findById(userId) : null;
  if (!user) throw new AppError("The user for this token no longer exists.", 401);

  req.user = user;
  next();
};

/**
 * 403 when the user is known but their role is not allowed. Use after `authenticate`.
 */
export const authorize =
  (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new AppError("Authentication required. Send a Bearer token.", 401);
    if (!roles.includes(req.user.role)) {
      throw new AppError("You do not have permission to perform this action.", 403);
    }
    next();
  };
