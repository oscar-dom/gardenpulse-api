import { Router } from "express";
import { getSensor, getSensors } from "../controllers/sensor.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { idParamsSchema } from "../schemas/common.schema.js";
import { listSensorsQuerySchema } from "../schemas/sensor.schema.js";

export const sensorRouter = Router();

// No sensor operation is available without a token.
sensorRouter.use(authenticate);

sensorRouter.get("/", validate({ query: listSensorsQuerySchema }), getSensors);
sensorRouter.get("/:id", validate({ params: idParamsSchema }), getSensor);
