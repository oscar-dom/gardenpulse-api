import { Router } from "express";
import {
  getSensor,
  getSensors,
  patchSensor,
  postSensor,
  removeSensor,
} from "../controllers/sensor.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { idParamsSchema } from "../schemas/common.schema.js";
import {
  createSensorSchema,
  deleteSensorQuerySchema,
  listSensorsQuerySchema,
  updateSensorSchema,
} from "../schemas/sensor.schema.js";

export const sensorRouter = Router();

// No sensor operation is available without a token.
sensorRouter.use(authenticate);

// Reading the catalog: any authenticated user.
sensorRouter.get("/", validate({ query: listSensorsQuerySchema }), getSensors);
sensorRouter.get("/:id", validate({ params: idParamsSchema }), getSensor);

// Managing the catalog: admins only (403 for regular users).
sensorRouter.post("/", authorize("admin"), validate({ body: createSensorSchema }), postSensor);
sensorRouter.patch(
  "/:id",
  authorize("admin"),
  validate({ params: idParamsSchema, body: updateSensorSchema }),
  patchSensor,
);
sensorRouter.delete(
  "/:id",
  authorize("admin"),
  validate({ params: idParamsSchema, query: deleteSensorQuerySchema }),
  removeSensor,
);
