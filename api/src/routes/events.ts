import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../middleware/auth";
import { sseConnect } from "../lib/sse";

const router = Router();

router.get("/", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.user!;
    const channels = [`user:${payload.userId}`, `role:${payload.role}`];
    if (payload.companyId) channels.push(`company:${payload.companyId}`);
    sseConnect(req, res, channels);
  } catch (err) { next(err); }
});

export default router;
