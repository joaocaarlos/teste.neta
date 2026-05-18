const DEFAULT_VALUES = new Set([
  "capacity123",
  "redis123",
  "supersecretkey",
  "supersecretkey_change_in_production",
  "dev-secret-change-me",
  "troque_isso_em_producao_use_256bits_aleatorio",
  "admin123",
]);

function missing(name: string): boolean {
  return !process.env[name] || !String(process.env[name]).trim();
}

function weak(name: string): boolean {
  const value = process.env[name];
  return !value || value.length < 24 || DEFAULT_VALUES.has(value);
}

function hasEmailProvider(): boolean {
  return Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST);
}

function isHttpsUrl(value?: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function validStripeSecretKey(value?: string): boolean {
  const key = value?.trim();
  return Boolean(key && /^sk_(test|live)_/.test(key) && key.length >= 50);
}

export function assertProductionConfig(): void {
  if (process.env.NODE_ENV !== "production") return;

  const errors: string[] = [];
  const paymentProvider = (process.env.PAYMENTS_PROVIDER || "manual").toLowerCase();

  if (weak("JWT_SECRET")) errors.push("JWT_SECRET forte e obrigatorio em producao.");
  for (const name of ["DB_PASS", "REDIS_PASS", "S3_SECRET_ACCESS_KEY"]) {
    if (weak(name)) errors.push(`${name} deve ser forte e diferente do padrao.`);
  }
  if (weak("MINIO_ROOT_PASSWORD") && missing("S3_ENDPOINT")) {
    errors.push("MINIO_ROOT_PASSWORD deve ser forte quando MinIO for usado.");
  }
  if (!isHttpsUrl(process.env.APP_URL)) errors.push("APP_URL deve usar HTTPS em producao.");
  for (const origin of (process.env.CORS_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean)) {
    if (!isHttpsUrl(origin)) errors.push(`CORS_ORIGIN deve usar HTTPS em producao: ${origin}`);
  }
  if (!hasEmailProvider()) errors.push("Configure RESEND_API_KEY ou SMTP_HOST para envio real de e-mail.");
  if (missing("S3_BUCKET")) errors.push("S3_BUCKET e obrigatorio para storage persistente.");
  if (missing("SENTRY_DSN")) errors.push("SENTRY_DSN e obrigatorio para triagem de erros em producao.");
  if (missing("ERROR_WEBHOOK_URL")) errors.push("ERROR_WEBHOOK_URL e obrigatorio para alerta de 5xx em producao.");
  if (missing("METRICS_TOKEN")) errors.push("METRICS_TOKEN e obrigatorio para proteger /metrics em producao.");

  if (paymentProvider === "stripe") {
    if (missing("STRIPE_SECRET_KEY")) errors.push("STRIPE_SECRET_KEY e obrigatorio com PAYMENTS_PROVIDER=stripe.");
    else if (!validStripeSecretKey(process.env.STRIPE_SECRET_KEY)) errors.push("STRIPE_SECRET_KEY parece truncada ou invalida.");
    if (missing("STRIPE_WEBHOOK_SECRET")) errors.push("STRIPE_WEBHOOK_SECRET e obrigatorio com PAYMENTS_PROVIDER=stripe.");
  } else if (process.env.ALLOW_MANUAL_PAYMENTS !== "true") {
    errors.push("PAYMENTS_PROVIDER=stripe e obrigatorio em producao, a menos que ALLOW_MANUAL_PAYMENTS=true.");
  }

  if (errors.length) {
    throw new Error(`Configuracao de producao incompleta:\n- ${errors.join("\n- ")}`);
  }
}

export function productionConfigStatus(): { ok: boolean; errors: string[] } {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    assertProductionConfig();
    return { ok: true, errors: [] };
  } catch (err) {
    return { ok: false, errors: String((err as Error).message).split("\n").slice(1).map((s) => s.replace(/^- /, "")) };
  } finally {
    process.env.NODE_ENV = previous;
  }
}
