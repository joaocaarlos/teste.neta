import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { Readable } from "stream";
import { Request } from "express";
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { query } from "../db";
import { logger } from "./logger";

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"));

const STORAGE_PROVIDER = (process.env.UPLOAD_STORAGE || (process.env.S3_BUCKET ? "s3" : "disk")).toLowerCase();
const S3_BUCKET = process.env.S3_BUCKET || process.env.MINIO_BUCKET || "";
const MAX_BYTES = Number(process.env.UPLOAD_MAX_BYTES) || 10 * 1024 * 1024;

const MIME_RULES: Record<string, RegExp> = {
  avatar: /^image\/(png|jpe?g|webp)$/i,
  logo: /^image\/(png|jpe?g|webp|svg\+xml)$/i,
  doc: /^(application\/pdf|image\/(png|jpe?g)|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/i,
  drawing: /^(application\/pdf|image\/(png|jpe?g|webp)|application\/(octet-stream|dxf|step|stp|iges|igs)|model\/(step|iges|stl))/i,
  default: /^(application\/pdf|image\/(png|jpe?g|webp|gif)|application\/(zip|msword|vnd\.openxmlformats-officedocument\.|vnd\.ms-excel)|text\/(plain|csv))/i,
};
type UploadCategory = keyof typeof MIME_RULES;
type CategorizedFile = Express.Multer.File & { uploadCategory?: UploadCategory };

const CATEGORY_MAX_BYTES: Partial<Record<UploadCategory, number>> = {
  avatar: 2 * 1024 * 1024,
  logo: 3 * 1024 * 1024,
};

let s3Client: S3Client | null = null;

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function isS3StorageEnabled(): boolean {
  return STORAGE_PROVIDER === "s3" || Boolean(process.env.S3_ENDPOINT);
}

function getS3Client(): S3Client {
  if (s3Client) return s3Client;

  const credentials = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || "",
      }
    : undefined;

  s3Client = new S3Client({
    endpoint: process.env.S3_ENDPOINT || undefined,
    region: process.env.S3_REGION || process.env.AWS_REGION || "us-east-1",
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
    credentials,
  });
  return s3Client;
}

function assertStorageKey(storageKey: string): void {
  if (!storageKey || storageKey.includes("..") || path.isAbsolute(storageKey)) {
    throw new Error("Storage key invalida.");
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const now = new Date();
    const dir = path.join(UPLOAD_DIR, String(now.getUTCFullYear()), String(now.getUTCMonth() + 1).padStart(2, "0"));
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const id = crypto.randomUUID();
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, "");
    cb(null, `${id}${ext}`);
  },
});

export function makeUploader(category: UploadCategory = "default") {
  return multer({
    storage,
    limits: { fileSize: Math.min(MAX_BYTES, CATEGORY_MAX_BYTES[category] || MAX_BYTES), files: 5 },
    fileFilter: (_req, file, cb) => {
      const rule = MIME_RULES[category] || MIME_RULES.default;
      (file as CategorizedFile).uploadCategory = category;
      if (rule.test(file.mimetype)) return cb(null, true);
      cb(new Error(`Tipo ${file.mimetype} nao permitido para ${category}.`));
    },
  });
}

export interface SavedFile {
  id: string;
  storage_key: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  url: string;
}

async function hashFile(filePath: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    fs.createReadStream(filePath)
      .on("data", (d) => hash.update(d))
      .on("end", () => resolve(hash.digest("hex")))
      .on("error", reject);
  });
}

function uploadError(message: string): Error & { statusCode?: number } {
  const err = new Error(message) as Error & { statusCode?: number };
  err.statusCode = 400;
  return err;
}

async function readHead(filePath: string, bytes = 1024): Promise<Buffer> {
  const handle = await fs.promises.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(bytes);
    const { bytesRead } = await handle.read(buffer, 0, bytes, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

function hasNullByte(buffer: Buffer): boolean {
  return buffer.includes(0);
}

async function assertFileSignature(file: CategorizedFile): Promise<void> {
  const head = await readHead(file.path);
  const mime = file.mimetype.toLowerCase();
  const category = file.uploadCategory || "default";
  const ascii = head.toString("utf8");
  const hex = head.toString("hex");

  const looks = {
    pdf: head.subarray(0, 4).toString("ascii") === "%PDF",
    png: hex.startsWith("89504e470d0a1a0a"),
    jpeg: hex.startsWith("ffd8ff"),
    gif: head.subarray(0, 4).toString("ascii") === "GIF8",
    webp: head.subarray(0, 4).toString("ascii") === "RIFF" && head.subarray(8, 12).toString("ascii") === "WEBP",
    zip: hex.startsWith("504b0304") || hex.startsWith("504b0506") || hex.startsWith("504b0708"),
    officeBinary: hex.startsWith("d0cf11e0a1b11ae1"),
    svg: category === "logo" && /<svg[\s>]/i.test(ascii.slice(0, 512)),
  };

  if (mime === "application/pdf" && !looks.pdf) {
    throw uploadError("Arquivo declarado como PDF nao tem assinatura PDF valida.");
  }
  if (mime === "image/png" && !looks.png) throw uploadError("Arquivo PNG invalido.");
  if ((mime === "image/jpeg" || mime === "image/jpg") && !looks.jpeg) throw uploadError("Arquivo JPEG invalido.");
  if (mime === "image/gif" && !looks.gif) throw uploadError("Arquivo GIF invalido.");
  if (mime === "image/webp" && !looks.webp) throw uploadError("Arquivo WEBP invalido.");
  if (mime === "image/svg+xml" && !looks.svg) throw uploadError("SVG invalido ou fora da categoria permitida.");
  if (mime.includes("openxmlformats") && !looks.zip) throw uploadError("Documento Office invalido.");
  if (mime === "application/zip" && !looks.zip) throw uploadError("Arquivo ZIP invalido.");
  if (mime === "application/msword" && !looks.officeBinary && !looks.zip) throw uploadError("Documento Word invalido.");
  if (mime.startsWith("text/") && hasNullByte(head)) throw uploadError("Arquivo texto contem bytes binarios invalidos.");
}

async function uploadToS3(storageKey: string, file: Express.Multer.File): Promise<void> {
  if (!S3_BUCKET) throw new Error("S3_BUCKET/MINIO_BUCKET nao configurado para uploads.");
  await getS3Client().send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: storageKey,
    Body: fs.createReadStream(file.path),
    ContentType: file.mimetype,
    Metadata: { originalName: Buffer.from(file.originalname).toString("base64") },
  }));
}

export async function persistUpload(
  req: Request,
  file: Express.Multer.File,
  entityType?: string,
  entityId?: string,
  isPublic = false
): Promise<SavedFile> {
  const storageKey = path.relative(UPLOAD_DIR, file.path).replace(/\\/g, "/");
  assertStorageKey(storageKey);

  try {
    await assertFileSignature(file as CategorizedFile);
  } catch (err) {
    await fs.promises.unlink(file.path).catch(() => undefined);
    throw err;
  }

  const sha256 = await hashFile(file.path);
  if (isS3StorageEnabled()) {
    await uploadToS3(storageKey, file);
    await fs.promises.unlink(file.path).catch((err) => {
      logger.warn({ err, storageKey }, "[upload] failed to remove local temp file");
    });
  }

  const { rows } = await query<{ id: string }>(
    `INSERT INTO uploaded_files
       (storage_key, original_name, mime_type, size_bytes, sha256, uploaded_by, entity_type, entity_id, public)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [
      storageKey,
      file.originalname,
      file.mimetype,
      file.size,
      sha256,
      req.user?.userId || null,
      entityType || null,
      entityId || null,
      isPublic,
    ]
  );

  return {
    id: rows[0].id,
    storage_key: storageKey,
    original_name: file.originalname,
    mime_type: file.mimetype,
    size_bytes: file.size,
    url: `/api/uploads/${rows[0].id}`,
  };
}

export function fileFullPath(storageKey: string): string {
  assertStorageKey(storageKey);
  return path.join(UPLOAD_DIR, storageKey);
}

export async function getUploadReadStream(
  storageKey: string
): Promise<{ stream: NodeJS.ReadableStream; contentLength?: number }> {
  assertStorageKey(storageKey);

  if (isS3StorageEnabled()) {
    if (!S3_BUCKET) throw new Error("S3_BUCKET/MINIO_BUCKET nao configurado para uploads.");
    const obj = await getS3Client().send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: storageKey }));
    const body = obj.Body;
    if (!body) throw new Error("Objeto indisponivel no storage.");
    if (body instanceof Readable || typeof (body as unknown as NodeJS.ReadableStream).pipe === "function") {
      return { stream: body as unknown as NodeJS.ReadableStream, contentLength: obj.ContentLength };
    }
    throw new Error("Resposta S3 nao e um stream legivel.");
  }

  const fullPath = path.resolve(fileFullPath(storageKey));
  if (!fullPath.startsWith(UPLOAD_DIR + path.sep) && fullPath !== UPLOAD_DIR) {
    throw new Error("Caminho de arquivo invalido.");
  }
  await fs.promises.access(fullPath, fs.constants.R_OK);
  const stat = await fs.promises.stat(fullPath);
  return { stream: fs.createReadStream(fullPath), contentLength: stat.size };
}

export async function ensureUploadStorageReady(): Promise<void> {
  if (isS3StorageEnabled()) {
    if (!S3_BUCKET) throw new Error("S3_BUCKET/MINIO_BUCKET nao configurado para uploads.");
    const client = getS3Client();
    try {
      await client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
    } catch {
      await client.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
    }
    const probeKey = `.health/${process.pid}-${Date.now()}`;
    await client.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: probeKey, Body: "ok", ContentType: "text/plain" }));
    await client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: probeKey }));
    return;
  }

  ensureDir(UPLOAD_DIR);
  const probe = path.join(UPLOAD_DIR, `.health-${process.pid}-${Date.now()}`);
  await fs.promises.writeFile(probe, "ok");
  await fs.promises.unlink(probe);
}
