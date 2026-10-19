import type { Request, Response } from "express";
import type { LoginInput, RegisterInput } from "../schemas/auth.schema.js";
import { loginUser, registerUser } from "../services/auth.service.js";

export const register = async (req: Request, res: Response): Promise<void> => {
  const user = await registerUser(req.body as RegisterInput);
  res.status(201).json({ status: "success", data: { user } });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { user, token } = await loginUser(req.body as LoginInput);
  res.status(200).json({ status: "success", data: { token, user } });
};

// Only reached through `authenticateToken`, which guarantees `req.user`.
export const me = (req: Request, res: Response): void => {
  res.status(200).json({ status: "success", data: { user: req.user } });
};
