import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import path from "path";

// ── DB mock (upload.ts imports query from ../db) ───────────────────────────────
vi.mock("../../db", () => ({
  pool: { query: vi.fn(), connect: vi.fn() },
  query: vi.fn().mockResolvedValue({ rows: [{ id: "abc-123" }], rowCount: 1 }),
}));

// ── Logger mock ────────────────────────────────────────────────────────────────
vi.mock("../../lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ── isS3StorageEnabled() ───────────────────────────────────────────────────────

describe("isS3StorageEnabled()", () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.UPLOAD_STORAGE;
    delete process.env.S3_BUCKET;
    delete process.env.S3_ENDPOINT;
  });

  it("returns false when UPLOAD_STORAGE=disk", async () => {
    process.env.UPLOAD_STORAGE = "disk";
    delete process.env.S3_BUCKET;
    delete process.env.S3_ENDPOINT;
    const { isS3StorageEnabled } = await import("../../lib/upload");
    expect(isS3StorageEnabled()).toBe(false);
  });

  it("returns true when UPLOAD_STORAGE=s3", async () => {
    process.env.UPLOAD_STORAGE = "s3";
    const { isS3StorageEnabled } = await import("../../lib/upload");
    expect(isS3StorageEnabled()).toBe(true);
  });

  it("returns true when S3_ENDPOINT is set", async () => {
    delete process.env.UPLOAD_STORAGE;
    delete process.env.S3_BUCKET;
    process.env.S3_ENDPOINT = "http://localhost:9000";
    const { isS3StorageEnabled } = await import("../../lib/upload");
    expect(isS3StorageEnabled()).toBe(true);
  });

  it("returns true when S3_BUCKET is set and UPLOAD_STORAGE is not 'disk'", async () => {
    delete process.env.UPLOAD_STORAGE;
    process.env.S3_BUCKET = "my-bucket";
    delete process.env.S3_ENDPOINT;
    const { isS3StorageEnabled } = await import("../../lib/upload");
    // When S3_BUCKET is set, STORAGE_PROVIDER becomes 's3'
    expect(isS3StorageEnabled()).toBe(true);
  });
});

// ── fileFullPath() ─────────────────────────────────────────────────────────────

describe("fileFullPath()", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.UPLOAD_STORAGE = "disk";
    delete process.env.S3_BUCKET;
    delete process.env.S3_ENDPOINT;
    // Set a stable UPLOAD_DIR for tests
    process.env.UPLOAD_DIR = "/tmp/test-uploads";
  });

  afterEach(() => {
    vi.resetModules();
    delete process.env.UPLOAD_STORAGE;
    delete process.env.UPLOAD_DIR;
  });

  it("returns a path inside UPLOAD_DIR for a valid storage key", async () => {
    const { fileFullPath, UPLOAD_DIR } = await import("../../lib/upload");
    const result = fileFullPath("2026/01/test.pdf");
    expect(result.startsWith(UPLOAD_DIR)).toBe(true);
    expect(result).toContain("2026");
    expect(result).toContain("test.pdf");
  });

  it("returns the joined path matching path.join(UPLOAD_DIR, key)", async () => {
    const { fileFullPath, UPLOAD_DIR } = await import("../../lib/upload");
    const key = "2026/01/test.pdf";
    expect(fileFullPath(key)).toBe(path.join(UPLOAD_DIR, key));
  });

  it("throws for a path-traversal storage key containing '..'", async () => {
    const { fileFullPath } = await import("../../lib/upload");
    expect(() => fileFullPath("../../../etc/passwd")).toThrow();
  });

  it("throws for an absolute storage key", async () => {
    const { fileFullPath } = await import("../../lib/upload");
    expect(() => fileFullPath("/etc/passwd")).toThrow();
  });

  it("throws for an empty storage key", async () => {
    const { fileFullPath } = await import("../../lib/upload");
    expect(() => fileFullPath("")).toThrow();
  });
});

// ── makeUploader() ─────────────────────────────────────────────────────────────

describe("makeUploader()", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.UPLOAD_STORAGE = "disk";
    process.env.UPLOAD_DIR = "/tmp/test-uploads";
    delete process.env.S3_BUCKET;
    delete process.env.S3_ENDPOINT;
  });

  afterEach(() => {
    vi.resetModules();
    delete process.env.UPLOAD_STORAGE;
    delete process.env.UPLOAD_DIR;
  });

  it("returns a multer instance with .single() and .array() for the 'doc' category", async () => {
    const { makeUploader } = await import("../../lib/upload");
    const uploader = makeUploader("doc");
    // multer() returns an object (not a bare function) with middleware methods
    expect(uploader).toBeDefined();
    expect(typeof (uploader as ReturnType<typeof makeUploader> & { single?: unknown }).single).toBe("function");
  });

  it("returns a multer instance for the 'avatar' category", async () => {
    const { makeUploader } = await import("../../lib/upload");
    const uploader = makeUploader("avatar");
    expect(uploader).toBeDefined();
    expect(typeof (uploader as ReturnType<typeof makeUploader> & { single?: unknown }).single).toBe("function");
  });

  it("returns a multer instance when no category is provided (uses default)", async () => {
    const { makeUploader } = await import("../../lib/upload");
    // @ts-expect-error — testing default fallback with no argument
    const uploader = makeUploader();
    expect(uploader).toBeDefined();
    expect(typeof (uploader as ReturnType<typeof makeUploader> & { single?: unknown }).single).toBe("function");
  });

  it("multer instance has a .single() method", async () => {
    const { makeUploader } = await import("../../lib/upload");
    const uploader = makeUploader("logo");
    expect(typeof (uploader as ReturnType<typeof makeUploader> & { single?: unknown }).single).toBe("function");
  });

  it("multer instance has an .array() method", async () => {
    const { makeUploader } = await import("../../lib/upload");
    const uploader = makeUploader("drawing");
    expect(typeof (uploader as ReturnType<typeof makeUploader> & { array?: unknown }).array).toBe("function");
  });
});
