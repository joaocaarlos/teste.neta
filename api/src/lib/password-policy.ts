import crypto from "crypto";

/**
 * Política de senha — NIST SP 800-63B style (modernizado).
 *
 * Princípios:
 *   - Comprimento > complexidade (min 8 chars, max 128)
 *   - Bloqueia top-1000 senhas mais vazadas
 *   - Bloqueia senha = email (parte local)
 *   - Não exige rotação periódica (NIST recomenda parar isso)
 *   - Verifica HIBP via k-anonymity (opcional, em produção)
 */

const MIN_LENGTH = Number(process.env.PASSWORD_MIN_LENGTH) || 8;
const MAX_LENGTH = 128;

// Top senhas mais vazadas (subconjunto — em produção carregar de arquivo)
const COMMON_PASSWORDS = new Set([
  "password", "12345678", "123456789", "qwerty123", "abc123456",
  "password1", "iloveyou1", "admin1234", "letmein123", "welcome1",
  "senha1234", "brasil123", "12345abc", "qwertyuiop", "asdfghjkl",
  "1qaz2wsx3edc", "qazwsxedc", "trustno1", "monkey123", "dragon123",
  "starwars1", "football1", "baseball1", "superman1", "batman123",
  "Password1", "Password123", "Admin@123", "Welcome@123", "Brasil@123",
]);

export interface PasswordCheckResult {
  ok: boolean;
  errors: string[];
  strength: "weak" | "fair" | "good" | "strong";
}

export function checkPasswordStrength(
  password: string,
  context?: { email?: string; name?: string; cnpj?: string }
): PasswordCheckResult {
  const errors: string[] = [];

  if (!password || typeof password !== "string") {
    return { ok: false, errors: ["Senha obrigatória."], strength: "weak" };
  }

  if (password.length < MIN_LENGTH) {
    errors.push(`Senha deve ter ao menos ${MIN_LENGTH} caracteres.`);
  }
  if (password.length > MAX_LENGTH) {
    errors.push(`Senha não pode passar de ${MAX_LENGTH} caracteres.`);
  }

  // Pelo menos 3 categorias: minúscula, maiúscula, dígito, especial
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const categories = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;

  if (categories < 3) {
    errors.push("Senha deve combinar pelo menos 3 de: minúscula, maiúscula, dígito, especial.");
  }

  // Sequências óbvias
  if (/(.)(\1){3,}/.test(password)) {
    errors.push("Evite repetir o mesmo caractere 4+ vezes seguidas.");
  }
  if (/(?:0123|1234|2345|3456|4567|5678|6789|abcd|qwer|asdf|zxcv)/i.test(password)) {
    errors.push("Evite sequências previsíveis (1234, abcd, qwerty…).");
  }

  // Common passwords (case-insensitive)
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push("Esta senha está entre as mais vazadas. Escolha outra.");
  }

  // Não pode conter parte do email/nome/cnpj
  if (context) {
    const lower = password.toLowerCase();
    const emailLocal = context.email?.split("@")[0]?.toLowerCase();
    if (emailLocal && emailLocal.length >= 4 && lower.includes(emailLocal)) {
      errors.push("Senha não pode conter parte do seu e-mail.");
    }
    if (context.name) {
      const firstName = context.name.split(/\s+/)[0]?.toLowerCase();
      if (firstName && firstName.length >= 4 && lower.includes(firstName)) {
        errors.push("Senha não pode conter seu nome.");
      }
    }
    if (context.cnpj) {
      const digits = context.cnpj.replace(/\D/g, "");
      if (digits.length >= 6 && password.includes(digits.slice(0, 8))) {
        errors.push("Senha não pode conter seu CNPJ.");
      }
    }
  }

  // Strength score
  let score = 0;
  if (password.length >= 10) score++;
  if (password.length >= 14) score++;
  if (categories >= 3) score++;
  if (categories === 4) score++;
  if (password.length >= 18) score++;

  const strength: PasswordCheckResult["strength"] =
    score <= 1 ? "weak" : score === 2 ? "fair" : score === 3 ? "good" : "strong";

  return { ok: errors.length === 0, errors, strength };
}

/**
 * HIBP k-anonymity check (Have I Been Pwned).
 * Envia apenas os 5 primeiros chars do SHA-1 — nunca a senha inteira.
 *
 * Use apenas em fluxos sensíveis (mudança de senha admin) para não
 * afogar a API. Retorna número de vezes que a senha foi vazada.
 */
export async function checkHIBP(password: string): Promise<number> {
  try {
    const hash = crypto.createHash("sha1").update(password).digest("hex").toUpperCase();
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "User-Agent": "CapaCity-PasswordCheck" },
    });
    if (!res.ok) return 0;

    const text = await res.text();
    for (const line of text.split("\n")) {
      const [s, c] = line.trim().split(":");
      if (s === suffix) return Number(c) || 0;
    }
    return 0;
  } catch {
    return 0;
  }
}
