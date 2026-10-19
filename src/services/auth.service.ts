import { mongo } from "mongoose";
import { EmailAlreadyRegisteredError, InvalidCredentialsError } from "../errors/auth.errors.js";
import { UserModel } from "../models/user.model.js";
import type { LoginInput, RegisterInput } from "../schemas/auth.schema.js";
import { signToken } from "./token.service.js";

const DUPLICATE_KEY = 11000;

/** Creates a regular user. A request for admin is stored as pending, never granted. */
export const registerUser = async ({ requestAdmin, ...data }: RegisterInput) => {
  const emailTaken = await UserModel.exists({ email: data.email });
  if (emailTaken) throw new EmailAlreadyRegisteredError();

  try {
    return await UserModel.create({
      ...data,
      role: "user",
      ...(requestAdmin && { adminRequest: "pending" }),
    });
  } catch (error) {
    // Two sign-ups with the same email at once: the unique index catches the second.
    if (error instanceof mongo.MongoServerError && error.code === DUPLICATE_KEY) {
      throw new EmailAlreadyRegisteredError();
    }
    throw error;
  }
};

/**
 * Checks the credentials and returns the user with a signed token. An unknown email
 * and a wrong password give the same 401, so the response does not reveal which
 * emails are registered.
 */
export const loginUser = async ({ email, password }: LoginInput) => {
  const user = await UserModel.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    throw new InvalidCredentialsError();
  }

  return { user, token: signToken(user.id) };
};
