import express from "express";
import { globalErrorHandler, notFoundHandler } from "./middlewares/error.middleware.js";
import { authRouter } from "./routes/auth.routes.js";
import { healthRouter } from "./routes/health.routes.js";
import { userRouter } from "./routes/user.routes.js";

export const app = express();

app.disable("x-powered-by");
app.use(express.json());

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);

// Always last, in this order.
app.use(notFoundHandler);
app.use(globalErrorHandler);
