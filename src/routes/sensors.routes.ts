import { Router } from "express";
import { postReading } from "../controllers/readings.controller.js";
import {
  getSensor,
  getSensors,
  patchSensor,
  postSensor,
  removeSensor,
} from "../controllers/sensors.controller.js";
import { authenticateToken, authorizeRoles } from "../middlewares/auth.middleware.js";
import { validateBody, validateParams, validateQuery } from "../middlewares/validate.middleware.js";
import { idParamsSchema } from "../schemas/common.schema.js";
import { createReadingSchema } from "../schemas/reading.schema.js";
import {
  createSensorSchema,
  deleteSensorQuerySchema,
  listSensorsQuerySchema,
  updateSensorSchema,
} from "../schemas/sensor.schema.js";

export const sensorsRouter = Router();

// No sensor operation is available without a token.
sensorsRouter.use(authenticateToken);

// Reading the catalog: any authenticated user.
sensorsRouter.get("/", validateQuery(listSensorsQuerySchema), getSensors);
sensorsRouter.get("/:id", validateParams(idParamsSchema), getSensor);

// Recording a reading of a sensor: any authenticated user. Nested under the sensor
// so an unknown sensor is a plain 404 on the URL.
sensorsRouter.post(
  "/:id/readings",
  validateParams(idParamsSchema),
  validateBody(createReadingSchema),
  postReading,
);

// Managing the catalog: admins only (403 for regular users).
sensorsRouter.post("/", authorizeRoles("admin"), validateBody(createSensorSchema), postSensor);
sensorsRouter.patch(
  "/:id",
  authorizeRoles("admin"),
  validateParams(idParamsSchema),
  validateBody(updateSensorSchema),
  patchSensor,
);
sensorsRouter.delete(
  "/:id",
  authorizeRoles("admin"),
  validateParams(idParamsSchema),
  validateQuery(deleteSensorQuerySchema),
  removeSensor,
);
