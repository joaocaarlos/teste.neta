import { Router } from "express";
const router = Router();
router.all("*", (_req, res) => {
  res.status(501).json({ error: "Funcionalidade ainda não implementada.", code: "not_implemented" });
});
export default router;
