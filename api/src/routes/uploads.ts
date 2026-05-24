import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { query } from "../db";
import { ok, fail } from "../lib/response";
import { authenticate, optionalAuthenticate } from "../middleware/auth";
import { makeUploader, persistUpload, getUploadReadStream } from "../lib/upload";
import { logger } from "../lib/logger";

const router = Router();

type UploadCategory = "doc" | "drawing" | "avatar" | "logo" | "default";
const VALID_CATEGORIES: UploadCategory[] = ["doc", "drawing", "avatar", "logo", "default"];

function parseCategory(raw: unknown): UploadCategory {
  if (typeof raw === "string" && VALID_CATEGORIES.includes(raw as UploadCategory)) {
    return raw as UploadCategory;
  }
  return "default";
}

interface UploadedFileRow {
  id: string;
  storage_key: string;
  original_name: string;
  mime_type: string;
  size_bytes: string;
  uploaded_by: string;
  public: boolean;
  deleted_at: string | null;
}

// POST /uploads
router.post("/", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  const category = parseCategory(req.query.category);
  const uploader = makeUploader(category);

  uploader.array("files", 5)(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return fail(res, err.message, "UPLOAD_ERROR", 400);
      }
      return fail(res, (err as Error).message || "Erro no upload.", "UPLOAD_ERROR", 400);
    }

    try {
      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        return fail(res, "Nenhum arquivo enviado.", "NO_FILES", 400);
      }

      const saved = await Promise.all(
        files.map((file) => persistUpload(req, file, category, undefined, false))
      );

      return ok(
        res,
        saved.map((f) => ({
          id: f.id,
          original_name: f.original_name,
          mime_type: f.mime_type,
          size_bytes: f.size_bytes,
          url: f.url,
        })),
        undefined,
        201
      );
    } catch (e) {
      logger.error({ err: e }, "[uploads] POST error");
      next(e);
    }
  });
});

// GET /uploads/:id
router.get("/:id", optionalAuthenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query<UploadedFileRow>(
      `SELECT id, storage_key, original_name, mime_type, size_bytes, uploaded_by, public, deleted_at
         FROM uploaded_files
        WHERE id = $1`,
      [req.params.id]
    );

    if (!rows[0]) {
      return fail(res, "Arquivo não encontrado.", "NOT_FOUND", 404);
    }

    const file = rows[0];

    if (file.deleted_at) {
      return fail(res, "Arquivo removido.", "GONE", 410);
    }

    if (!file.public && !req.user) {
      return fail(res, "Autenticação necessária.", "UNAUTHORIZED", 401);
    }

    const { stream, contentLength } = await getUploadReadStream(file.storage_key);

    res.setHeader("Content-Type", file.mime_type);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(file.original_name)}"`
    );
    if (contentLength !== undefined) {
      res.setHeader("Content-Length", contentLength);
    }

    stream.pipe(res);
    stream.on("error", (err) => {
      logger.error({ err }, "[uploads] stream error");
      if (!res.headersSent) {
        fail(res, "Erro ao ler arquivo.", "STREAM_ERROR", 500);
      }
    });
  } catch (e) {
    logger.error({ err: e }, "[uploads] GET error");
    next(e);
  }
});

// DELETE /uploads/:id
router.delete("/:id", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await query<UploadedFileRow>(
      `SELECT id, uploaded_by, deleted_at FROM uploaded_files WHERE id = $1`,
      [req.params.id]
    );

    if (!rows[0]) {
      return fail(res, "Arquivo não encontrado.", "NOT_FOUND", 404);
    }

    const file = rows[0];

    if (file.deleted_at) {
      return fail(res, "Arquivo já removido.", "ALREADY_DELETED", 410);
    }

    const isOwner = file.uploaded_by === req.user!.userId;
    const isAdmin = req.user!.role === "admin";

    if (!isOwner && !isAdmin) {
      return fail(res, "Permissão insuficiente.", "FORBIDDEN", 403);
    }

    await query(
      `UPDATE uploaded_files SET deleted_at = NOW() WHERE id = $1`,
      [req.params.id]
    );

    return ok(res, { id: req.params.id }, "Arquivo removido.");
  } catch (e) {
    logger.error({ err: e }, "[uploads] DELETE error");
    next(e);
  }
});

export default router;
