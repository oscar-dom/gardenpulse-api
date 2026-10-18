import { AppError } from "../errors/app.error.js";
import { UserModel } from "../models/user.model.js";
import type { AdminRequestDecision } from "../schemas/user.schema.js";

/** Users waiting for an admin to decide on their request, oldest first. */
export const listPendingAdminRequests = () =>
  UserModel.find({ adminRequest: "pending" }).sort({ createdAt: 1 });

/**
 * Approves (the user becomes admin) or rejects a pending request. Only a pending
 * request can be decided, and the update is atomic, so two admins deciding at the
 * same time cannot both succeed.
 */
export const decideAdminRequest = async (userId: string, decision: AdminRequestDecision) => {
  const update =
    decision === "approve"
      ? { role: "admin", adminRequest: "approved" }
      : { adminRequest: "rejected" };

  const user = await UserModel.findOneAndUpdate({ _id: userId, adminRequest: "pending" }, update, {
    returnDocument: "after",
    runValidators: true,
  });
  if (user) return user;

  const exists = await UserModel.exists({ _id: userId });
  if (!exists) throw new AppError("User not found.", 404);
  throw new AppError("This user has no pending admin request.", 409);
};
