import cors from "cors";

export const apiCors = cors({
  origin: true,
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "X-Guest-Token", "x-guest-token", "X-Idempotency-Key", "X-Claim-Profile-Id", "X-Replace-Intake", "X-Intake-Segment"],
  exposedHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining", "Retry-After"],
});
