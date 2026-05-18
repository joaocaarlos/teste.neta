import { Router, Request, Response, NextFunction } from "express";
import { body } from "express-validator";
import multer from "multer";
import { query } from "../db";
import { ok, fail } from "../lib/response";
import { authenticate, authorize } from "../middleware/auth";
import { validate } from "../lib/validators";
import { makeUploader, persistUpload } from "../lib/upload";
import { logger } from "../lib/logger";

const router = Router();

const VALID_DOC_TYPES = ["cnpj_card", "social_contract", "id_front", "id_back", "selfie", "other"] as const;
type KycDocType = (typeof VALID_DOC_TYPES)[number];

const REQUIRED_DOC_TYPES: KycDocType[] = ["cnpj_card", "social_contract", "id_front"];

const kycUploader = makeUploader("doc");

interface KycDocRow {
  id: string;
  company_id: string;
  doc_type: KycDocType;
  file_id: string;
  status: "pending" | "approved" | "rejected";
  reviewer_id: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// ─── GET /verification — list own company's KYC documents ────────────────────

router.get(
  "/",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      if (!companyId) return fail(res, "Usuário sem empresa associada.", "NO_COMPANY", 403);

      const { rows } = await query<KycDocRow>(
        `SELECT id, company_id, doc_type, file_id, status, reviewer_id, review_note, reviewed_at, created_at
           FROM kyc_documents
          WHERE company_id = $1
          ORDER BY created_at DESC`,
        [companyId]
      );

      return ok(res, rows);
    } catch (e) {
      logger.error({ err: e }, "[verification] GET / error");
      next(e);
    }
  }
);

// ─── POST /verification/upload — upload KYC document ────────────────────────

router.post(
  "/upload",
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    kycUploader.single("file")(req, res, async (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          return fail(res, err.message, "UPLOAD_ERROR", 400);
        }
        return fail(res, (err as Error).message || "Erro no upload.", "UPLOAD_ERROR", 400);
      }
      next();
    });
  },
  validate([
    body("doc_type").isIn(VALID_DOC_TYPES).withMessage(`doc_type deve ser um de: ${VALID_DOC_TYPES.join(", ")}.`),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      if (!companyId) return fail(res, "Usuário sem empresa associada.", "NO_COMPANY", 403);

      const file = req.file;
      if (!file) return fail(res, "Nenhum arquivo enviado.", "NO_FILE", 400);

      const docType = req.body.doc_type as KycDocType;

      const saved = await persistUpload(req, file, "kyc", companyId, false);

      const { rows } = await query<KycDocRow>(
        `INSERT INTO kyc_documents (company_id, doc_type, file_id)
         VALUES ($1, $2, $3)
         RETURNING id, company_id, doc_type, file_id, status, reviewer_id, review_note, reviewed_at, created_at`,
        [companyId, docType, saved.id]
      );

      return ok(res, { ...rows[0], file_url: saved.url }, undefined, 201);
    } catch (e) {
      logger.error({ err: e }, "[verification] POST /upload error");
      next(e);
    }
  }
);

// ─── GET /verification/status ────────────────────────────────────────────────

router.get(
  "/status",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      if (!companyId) return fail(res, "Usuário sem empresa associada.", "NO_COMPANY", 403);

      const { rows } = await query<KycDocRow>(
        `SELECT id, doc_type, status, reviewed_at, created_at
           FROM kyc_documents
          WHERE company_id = $1
          ORDER BY created_at DESC`,
        [companyId]
      );

      // For each required doc type, take the most recent doc (already ordered DESC)
      const latestByType: Partial<Record<KycDocType, KycDocRow>> = {};
      for (const doc of rows) {
        if (!latestByType[doc.doc_type]) {
          latestByType[doc.doc_type] = doc;
        }
      }

      const hasAllRequired = REQUIRED_DOC_TYPES.every((t) => Boolean(latestByType[t]));
      const allApproved = REQUIRED_DOC_TYPES.every((t) => latestByType[t]?.status === "approved");
      const anyRejected = REQUIRED_DOC_TYPES.some((t) => latestByType[t]?.status === "rejected");
      const allPendingOrApproved = REQUIRED_DOC_TYPES.every(
        (t) => latestByType[t]?.status === "pending" || latestByType[t]?.status === "approved"
      );

      let overall: "incomplete" | "pending" | "approved" | "rejected";
      if (!hasAllRequired) {
        overall = "incomplete";
      } else if (allApproved) {
        overall = "approved";
        // Update company verified status
        await query(
          `UPDATE companies SET verified = true, kyc_verified_at = NOW() WHERE id = $1 AND (verified IS NOT TRUE)`,
          [companyId]
        );
      } else if (anyRejected) {
        overall = "rejected";
      } else if (allPendingOrApproved) {
        overall = "pending";
      } else {
        overall = "incomplete";
      }

      return ok(res, { overall, docs: rows });
    } catch (e) {
      logger.error({ err: e }, "[verification] GET /status error");
      next(e);
    }
  }
);

// ─── DELETE /verification/:docId — delete own pending document ───────────────

router.delete(
  "/:docId",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user!.companyId;
      if (!companyId) return fail(res, "Usuário sem empresa associada.", "NO_COMPANY", 403);

      const { rows } = await query<KycDocRow>(
        `SELECT id, company_id, status FROM kyc_documents WHERE id = $1`,
        [req.params.docId]
      );

      if (!rows[0]) return fail(res, "Documento não encontrado.", "NOT_FOUND", 404);
      const doc = rows[0];

      if (doc.company_id !== companyId) {
        return fail(res, "Permissão insuficiente.", "FORBIDDEN", 403);
      }
      if (doc.status !== "pending") {
        return fail(res, "Somente documentos pendentes podem ser removidos.", "INVALID_STATUS", 400);
      }

      await query(`DELETE FROM kyc_documents WHERE id = $1`, [req.params.docId]);

      return ok(res, { id: req.params.docId }, "Documento removido.");
    } catch (e) {
      logger.error({ err: e }, "[verification] DELETE /:docId error");
      next(e);
    }
  }
);

// ─── GET /verification/admin/queue — admin: list pending companies ────────────

router.get(
  "/admin/queue",
  authenticate,
  authorize("admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { rows } = await query<{
        company_id: string;
        company_name: string;
        pending_count: string;
        oldest_pending: string;
      }>(
        `SELECT kd.company_id,
                c.name AS company_name,
                COUNT(*) AS pending_count,
                MIN(kd.created_at) AS oldest_pending
           FROM kyc_documents kd
           JOIN companies c ON c.id = kd.company_id
          WHERE kd.status = 'pending'
          GROUP BY kd.company_id, c.name
          ORDER BY oldest_pending ASC`
      );

      return ok(res, rows);
    } catch (e) {
      logger.error({ err: e }, "[verification] GET /admin/queue error");
      next(e);
    }
  }
);

// ─── PATCH /verification/admin/:docId — admin: approve/reject document ───────

router.patch(
  "/admin/:docId",
  authenticate,
  authorize("admin"),
  validate([
    body("status").isIn(["approved", "rejected"]).withMessage("status deve ser 'approved' ou 'rejected'."),
    body("review_note").optional({ nullable: true }).isString().trim().isLength({ max: 1000 }),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, review_note } = req.body as { status: "approved" | "rejected"; review_note?: string };

      const { rows: existing } = await query<KycDocRow>(
        `SELECT id, company_id, status FROM kyc_documents WHERE id = $1`,
        [req.params.docId]
      );
      if (!existing[0]) return fail(res, "Documento não encontrado.", "NOT_FOUND", 404);

      const { rows: updated } = await query<KycDocRow>(
        `UPDATE kyc_documents
            SET status = $1,
                reviewer_id = $2,
                review_note = $3,
                reviewed_at = NOW()
          WHERE id = $4
          RETURNING id, company_id, doc_type, file_id, status, reviewer_id, review_note, reviewed_at, created_at`,
        [status, req.user!.userId, review_note ?? null, req.params.docId]
      );

      const doc = updated[0];

      // If approved, check if all required docs are now approved → verify company
      if (status === "approved") {
        const companyId = doc.company_id;
        const { rows: allDocs } = await query<{ doc_type: KycDocType; status: string }>(
          `SELECT DISTINCT ON (doc_type) doc_type, status
             FROM kyc_documents
            WHERE company_id = $1
            ORDER BY doc_type, created_at DESC`,
          [companyId]
        );

        const latestByType: Partial<Record<KycDocType, string>> = {};
        for (const d of allDocs) {
          latestByType[d.doc_type] = d.status;
        }

        const allRequiredApproved = REQUIRED_DOC_TYPES.every((t) => latestByType[t] === "approved");
        if (allRequiredApproved) {
          await query(
            `UPDATE companies SET verified = true, kyc_verified_at = NOW() WHERE id = $1`,
            [companyId]
          );
        }
      }

      return ok(res, doc);
    } catch (e) {
      logger.error({ err: e }, "[verification] PATCH /admin/:docId error");
      next(e);
    }
  }
);

export default router;
