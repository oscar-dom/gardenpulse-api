import express from "express";
import { globalErrorHandler, notFoundHandler } from "./middlewares/error.middleware.js";
import { healthRouter } from "./routes/health.routes.js";

export const app = express();

app.disable("x-powered-by");
app.use(express.json());

app.use("/api/health", healthRouter);

// Always last, in this order.
app.use(notFoundHandler);
app.use(globalErrorHandler);
