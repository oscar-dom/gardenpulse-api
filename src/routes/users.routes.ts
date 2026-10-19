import { Router } from "express";
import { getAdminRequests, updateAdminRequest } from "../controllers/users.controller.js";
import { authenticateToken, authorizeRoles } from "../middlewares/auth.middleware.js";
import { validateBody, validateParams } from "../middlewares/validate.middleware.js";
import { idParamsSchema } from "../schemas/common.schema.js";
import { adminRequestDecisionSchema } from "../schemas/user.schema.js";

export const usersRouter = Router();

// User management is admin-only: 401 without a valid token, 403 for regular users.
usersRouter.use(authenticateToken, authorizeRoles("admin"));

usersRouter.get("/admin-requests", getAdminRequests);
usersRouter.patch(
  "/:id/admin-request",
  validateParams(idParamsSchema),
  validateBody(adminRequestDecisionSchema),
  updateAdminRequest,
);
