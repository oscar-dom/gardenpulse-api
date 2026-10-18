import type { Request, Response } from "express";
import type { RegisterInput } from "../schemas/auth.schema.js";
import { registerUser } from "../services/auth.service.js";

export const register = async (req: Request, res: Response): Promise<void> => {
  const user = await registerUser(req.body as RegisterInput);
  res.status(201).json({ status: "success", data: { user } });
};
