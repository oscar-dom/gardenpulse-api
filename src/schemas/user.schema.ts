import { z } from "zod";

export const ADMIN_REQUEST_DECISIONS = ["approve", "reject"] as const;

export const adminRequestDecisionSchema = z.object({
  decision: z.enum(ADMIN_REQUEST_DECISIONS, {
    error: `decision must be one of: ${ADMIN_REQUEST_DECISIONS.join(", ")}`,
  }),
});

export type AdminRequestDecision = z.infer<typeof adminRequestDecisionSchema>["decision"];
