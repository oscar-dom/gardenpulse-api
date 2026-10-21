import cors from "cors";
import express from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import openapiSpec from "./docs/openapi.json" with { type: "json" };
import { globalErrorHandler, notFoundHandler } from "./middlewares/error.middleware.js";
import { globalLimiter } from "./middlewares/rateLimit.middleware.js";
import { authRouter } from "./routes/auth.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { readingsRouter } from "./routes/readings.routes.js";
import { sensorsRouter } from "./routes/sensors.routes.js";
import { usersRouter } from "./routes/users.routes.js";

export const app = express();

// Order matters: security headers, then CORS, then the rate limit, and only then
// parse the body, so rejected requests cost as little as possible.
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    methods: ["GET", "POST", "PATCH", "DELETE"],
  }),
);
app.use("/api", globalLimiter);
app.use(express.json());

// API documentation: interactive Swagger UI, plus the raw spec for other tools.
app.get("/api/docs/openapi.json", (_req, res) => {
  res.json(openapiSpec);
});
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/sensors", sensorsRouter);
app.use("/api/readings", readingsRouter);

// Always last, in this order.
app.use(notFoundHandler);
app.use(globalErrorHandler);
