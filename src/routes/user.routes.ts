import { Router } from "express";
import { getAdminRequests, updateAdminRequest } from "../controllers/user.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { idParamsSchema } from "../schemas/common.schema.js";
import { adminRequestDecisionSchema } from "../schemas/user.schema.js";

export const userRouter = Router();

// User management is admin-only: 401 without a valid token, 403 for regular users.
userRouter.use(authenticate, authorize("admin"));

userRouter.get("/admin-requests", getAdminRequests);
userRouter.patch(
  "/:id/admin-request",
  validate({ params: idParamsSchema, body: adminRequestDecisionSchema }),
  updateAdminRequest,
);
