import { Router } from "express";
import { register } from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { registerSchema } from "../schemas/auth.schema.js";

export const authRouter = Router();

authRouter.post("/register", validate({ body: registerSchema }), register);
