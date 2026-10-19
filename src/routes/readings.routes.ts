import { Router } from "express";
import { getReading, getReadings } from "../controllers/readings.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { idParamsSchema } from "../schemas/common.schema.js";
import { listReadingsQuerySchema } from "../schemas/reading.schema.js";

export const readingsRouter = Router();

// No reading operation is available without a token. Any role can read and record.
readingsRouter.use(authenticate);

readingsRouter.get("/", validate({ query: listReadingsQuerySchema }), getReadings);
readingsRouter.get("/:id", validate({ params: idParamsSchema }), getReading);
