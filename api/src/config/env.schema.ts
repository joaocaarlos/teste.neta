import { z } from "zod";

export const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3001),

  // Database
  DB_HOST: z.string().min(1).default("localhost"),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().min(1).default("capacity"),
  DB_PASS: z.string().min(1),
  DB_NAME: z.string().min(1).default("capacity"),
  DB_POOL_MAX: z.coerce.number().default(20),

  // Auth
  JWT_SECRET: z.string().min(32, "JWT_SECRET deve ter pelo menos 32 caracteres"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  BCRYPT_ROUNDS: z.coerce.number().min(1).max(20).default(10),

  // Redis
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASS: z.string().optional(),

  // Upload
  UPLOAD_STORAGE: z.enum(["disk", "s3"]).default("disk"),
  UPLOAD_MAX_BYTES: z.coerce.number().default(10_485_760),
  UPLOAD_DIR: z.string().default("uploads"),

  // S3/MinIO
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(false),

  // CORS
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  APP_URL: z.string().default("http://localhost:3000"),

  // Email
  MAIL_FROM: z.string().default("CapaCity <noreply@capacity.local>"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_QUEUE_ENABLED: z.coerce.boolean().default(true),
  EMAIL_QUEUE_CONCURRENCY: z.coerce.number().default(3),

  // Payments
  PAYMENTS_PROVIDER: z.enum(["manual", "stripe"]).default("manual"),
  ALLOW_MANUAL_PAYMENTS: z.coerce.boolean().default(true),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_CURRENCY: z.string().default("brl"),

  // Observability
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  SENTRY_DSN: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().default(0),
  ERROR_WEBHOOK_URL: z.string().optional(),
  METRICS_TOKEN: z.string().optional(),

  // Feature flags
  REQUIRE_EMAIL_VERIFICATION: z.coerce.boolean().default(true),
  RUN_MIGRATIONS: z.coerce.boolean().default(true),
  ENABLE_API_DOCS: z.coerce.boolean().default(false),

  // Security
  RATE_LIMIT_MAX: z.coerce.number().default(500),
  LOGIN_LOCKOUT_MAX: z.coerce.number().default(5),
  LOGIN_LOCKOUT_TTL_SECONDS: z.coerce.number().default(900),
  CAPTCHA_THRESHOLD: z.coerce.number().default(3),
  HCAPTCHA_SECRET: z.string().optional(),
  RECAPTCHA_SECRET: z.string().optional(),

  // CSP
  CSP_REPORT_URI: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;
