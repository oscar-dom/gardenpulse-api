import { config } from "dotenv";
import { z } from "zod";

config({ quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MONGODB_URI: z.string({ error: "MONGODB_URI is required" }).min(1, "MONGODB_URI is required"),
  JWT_SECRET: z
    .string({ error: "JWT_SECRET is required" })
    .min(32, "JWT_SECRET must be at least 32 characters long"),
  JWT_EXPIRES_IN: z.string().min(1).default("1h"),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(z.prettifyError(parsed.error));
  process.exit(1);
}

export const env: Env = parsed.data;
