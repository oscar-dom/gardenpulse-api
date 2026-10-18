import express from "express";
import { globalErrorHandler, notFoundHandler } from "./middlewares/error.middleware.js";
import { authRouter } from "./routes/auth.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { readingRouter } from "./routes/reading.routes.js";
import { sensorRouter } from "./routes/sensor.routes.js";
import { userRouter } from "./routes/user.routes.js";

export const app = express();

app.disable("x-powered-by");
app.use(express.json());

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/sensors", sensorRouter);
app.use("/api/readings", readingRouter);

// Always last, in this order.
app.use(notFoundHandler);
app.use(globalErrorHandler);
