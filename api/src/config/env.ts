import { EnvSchema } from "./env.schema";

const result = EnvSchema.safeParse(process.env);

if (!result.success) {
  // eslint-disable-next-line no-console
  console.error("Variáveis de ambiente inválidas:");
  result.error.issues.forEach((i) =>
    // eslint-disable-next-line no-console
    console.error(`  ${i.path.join(".")}: ${i.message}`)
  );
  process.exit(1);
}

export const env = result.data;
