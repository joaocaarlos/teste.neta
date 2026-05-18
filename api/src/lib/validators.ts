import { Request, Response, NextFunction } from "express";
import { body, ValidationChain, validationResult } from "express-validator";

export function validate(rules: ValidationChain[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await Promise.all(rules.map((rule) => rule.run(req)));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: "Dados inválidos.", details: errors.array() });
      return;
    }
    next();
  };
}

export const v = {
  email(field = "email") {
    return body(field).isEmail().withMessage("E-mail inválido.").normalizeEmail();
  },
  password(field = "password") {
    return body(field).isString().isLength({ min: 8, max: 128 }).withMessage("Senha deve ter entre 8 e 128 caracteres.");
  },
  notEmptyString(field: string, max = 255) {
    return body(field).isString().trim().notEmpty().withMessage(`${field} é obrigatório.`).isLength({ max }).withMessage(`${field} deve ter no máximo ${max} caracteres.`);
  },
  optionalString(field: string, max = 255) {
    return body(field).optional({ nullable: true, checkFalsy: true }).isString().trim().isLength({ max }).withMessage(`${field} deve ter no máximo ${max} caracteres.`);
  },
  cnpj(field = "cnpj") {
    return body(field).isString().trim().notEmpty().withMessage("CNPJ é obrigatório.");
  },
  enumOneOf(field: string, values: string[]) {
    return body(field).isIn(values).withMessage(`${field} deve ser um de: ${values.join(", ")}.`);
  },
  intRange(field: string, min: number, max: number) {
    return body(field).isInt({ min, max }).withMessage(`${field} deve ser um inteiro entre ${min} e ${max}.`).toInt();
  },
  optionalQuery(field: string) {
    return body(field).optional({ nullable: true, checkFalsy: true }).isString();
  },
};
