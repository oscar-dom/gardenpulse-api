import { mongo } from "mongoose";
import { AppError } from "../errors/app.error.js";
import { UserModel } from "../models/user.model.js";
import type { RegisterInput } from "../schemas/auth.schema.js";

const DUPLICATE_KEY = 11000;

/** Creates a regular user. A request for admin is stored as pending, never granted. */
export const registerUser = async ({ requestAdmin, ...data }: RegisterInput) => {
  const emailTaken = await UserModel.exists({ email: data.email });
  if (emailTaken) throw new AppError("Email is already registered.", 409);

  try {
    return await UserModel.create({
      ...data,
      role: "user",
      ...(requestAdmin && { adminRequest: "pending" }),
    });
  } catch (error) {
    // Two sign-ups with the same email at once: the unique index catches the second.
    if (error instanceof mongo.MongoServerError && error.code === DUPLICATE_KEY) {
      throw new AppError("Email is already registered.", 409);
    }
    throw error;
  }
};
