import { Router } from "express";
import { getReading } from "../controllers/reading.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { idParamsSchema } from "../schemas/common.schema.js";

export const readingRouter = Router();

// No reading operation is available without a token. Any role can read and record.
readingRouter.use(authenticate);

readingRouter.get("/:id", validate({ params: idParamsSchema }), getReading);
