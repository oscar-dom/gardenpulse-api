import type { Request, Response } from "express";
import type { AdminRequestDecision } from "../schemas/user.schema.js";
import { decideAdminRequest, listPendingAdminRequests } from "../services/user.service.js";

export const getAdminRequests = async (_req: Request, res: Response): Promise<void> => {
  const users = await listPendingAdminRequests();
  res.status(200).json({ status: "success", data: { users } });
};

export const updateAdminRequest = async (
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  const { decision } = req.body as { decision: AdminRequestDecision };
  const user = await decideAdminRequest(req.params.id, decision);
  res.status(200).json({ status: "success", data: { user } });
};
