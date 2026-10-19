import rateLimit from "express-rate-limit";

// Each IP may send at most 100 requests to /api every 15 minutes; then it gets a 429.
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true, // RateLimit-* headers tell the client its remaining quota
  legacyHeaders: false,
  message: {
    status: "fail",
    error: "TooManyRequests",
    message: "Too many requests. Try again in 15 minutes.",
  },
});
