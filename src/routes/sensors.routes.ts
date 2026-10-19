import { Router } from "express";
import { postReading } from "../controllers/readings.controller.js";
import {
  getSensor,
  getSensors,
  patchSensor,
  postSensor,
  removeSensor,
} from "../controllers/sensors.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
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
sensorsRouter.use(authenticate);

// Reading the catalog: any authenticated user.
sensorsRouter.get("/", validate({ query: listSensorsQuerySchema }), getSensors);
sensorsRouter.get("/:id", validate({ params: idParamsSchema }), getSensor);

// Recording a reading of a sensor: any authenticated user. Nested under the sensor
// so an unknown sensor is a plain 404 on the URL.
sensorsRouter.post(
  "/:id/readings",
  validate({ params: idParamsSchema, body: createReadingSchema }),
  postReading,
);

// Managing the catalog: admins only (403 for regular users).
sensorsRouter.post("/", authorize("admin"), validate({ body: createSensorSchema }), postSensor);
sensorsRouter.patch(
  "/:id",
  authorize("admin"),
  validate({ params: idParamsSchema, body: updateSensorSchema }),
  patchSensor,
);
sensorsRouter.delete(
  "/:id",
  authorize("admin"),
  validate({ params: idParamsSchema, query: deleteSensorQuerySchema }),
  removeSensor,
);
