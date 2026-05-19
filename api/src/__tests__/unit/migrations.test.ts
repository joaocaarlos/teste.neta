import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";

// ── DB mock ───────────────────────────────────────────────────────────────────
const mockClientQuery = vi.fn();
const mockClientRelease = vi.fn();
const mockPoolConnect = vi.fn();
const mockPoolQuery = vi.fn();

vi.mock("../../db", () => ({
  pool: {
    query: mockPoolQuery,
    connect: mockPoolConnect,
  },
  query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
}));

// ── Logger mock (avoids pino noise in test output) ────────────────────────────
vi.mock("../../lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
function resetClientMock(overrides: Partial<{ query: typeof mockClientQuery; rowCount: number }> = {}) {
  mockClientRelease.mockReset();
  mockClientQuery.mockReset();
  mockPoolConnect.mockReset();

  // Default: all client.query calls succeed and return empty rows
  mockClientQuery.mockResolvedValue({ rows: [], rowCount: overrides.rowCount ?? 0 });

  mockPoolConnect.mockResolvedValue({
    query: mockClientQuery,
    release: mockClientRelease,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("runMigrations()", () => {
  let existsSyncSpy: ReturnType<typeof vi.spyOn>;
  let readdirSyncSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules(); // ensure a fresh import each time
    resetClientMock();
    mockPoolQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    existsSyncSpy = vi.spyOn(fs, "existsSync");
    readdirSyncSpy = vi.spyOn(fs, "readdirSync");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.RUN_MIGRATIONS;
  });

  it("returns early when RUN_MIGRATIONS=false", async () => {
    process.env.RUN_MIGRATIONS = "false";
    const { runMigrations } = await import("../../lib/migrations");

    await runMigrations();

    // Should not have tried to check the filesystem at all
    expect(existsSyncSpy).not.toHaveBeenCalled();
  });

  it("returns early when migrations directory does not exist", async () => {
    existsSyncSpy.mockReturnValue(false);
    const { runMigrations } = await import("../../lib/migrations");

    await runMigrations();

    expect(mockPoolQuery).not.toHaveBeenCalled();
    expect(mockPoolConnect).not.toHaveBeenCalled();
  });

  it("creates the schema_migrations table when the directory exists but has no sql files", async () => {
    existsSyncSpy.mockReturnValue(true);
    readdirSyncSpy.mockReturnValue([] as unknown as ReturnType<typeof fs.readdirSync>);
    const { runMigrations } = await import("../../lib/migrations");

    await runMigrations();

    // ensureMigrationsTable should call pool.query with CREATE TABLE IF NOT EXISTS
    expect(mockPoolQuery).toHaveBeenCalledTimes(1);
    const sql: string = mockPoolQuery.mock.calls[0][0];
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS schema_migrations/i);
  });

  it("skips a migration that has already been applied (rowCount > 0)", async () => {
    existsSyncSpy.mockReturnValue(true);
    readdirSyncSpy.mockReturnValue(["001_init.sql"] as unknown as ReturnType<typeof fs.readdirSync>);

    // First call: CREATE TABLE (pool.query), then client calls
    mockPoolQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    // Make the SELECT 1 check return rowCount=1 → migration already applied
    mockClientQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ "?column?": 1 }], rowCount: 1 }) // SELECT 1 FROM schema_migrations
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // ROLLBACK

    const { runMigrations } = await import("../../lib/migrations");
    await runMigrations();

    // BEGIN → SELECT 1 → ROLLBACK (migration skipped; no SQL or INSERT executed)
    const calls = mockClientQuery.mock.calls.map((c) => (c[0] as string).trim());
    expect(calls).toContain("BEGIN");
    expect(calls.some((s: string) => s.includes("SELECT 1 FROM schema_migrations"))).toBe(true);
    expect(calls).toContain("ROLLBACK");
    // No INSERT should have happened
    expect(calls.some((s: string) => s.includes("INSERT INTO schema_migrations"))).toBe(false);
  });

  it("applies a new migration and inserts a record into schema_migrations", async () => {
    existsSyncSpy.mockReturnValue(true);
    readdirSyncSpy.mockReturnValue(["002_add_users.sql"] as unknown as ReturnType<typeof fs.readdirSync>);
    mockPoolQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    // Stub readFileSync to return fake SQL
    const readFileSyncSpy = vi.spyOn(fs, "readFileSync").mockReturnValue("CREATE TABLE users (id SERIAL PRIMARY KEY);" as unknown as Buffer);

    mockClientQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    const { runMigrations } = await import("../../lib/migrations");
    await runMigrations();

    const calls = mockClientQuery.mock.calls.map((c) => (c[0] as string).trim());
    expect(calls.some((s: string) => s.includes("INSERT INTO schema_migrations"))).toBe(true);
    expect(calls).toContain("COMMIT");

    readFileSyncSpy.mockRestore();
  });

  it("rolls back and rethrows when a migration SQL fails", async () => {
    existsSyncSpy.mockReturnValue(true);
    readdirSyncSpy.mockReturnValue(["003_bad.sql"] as unknown as ReturnType<typeof fs.readdirSync>);
    mockPoolQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    const readFileSyncSpy = vi.spyOn(fs, "readFileSync").mockReturnValue("INVALID SQL BOOM;" as unknown as Buffer);

    mockClientQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // SELECT 1 → not applied
      .mockRejectedValueOnce(new Error("syntax error")) // The migration SQL fails
      .mockResolvedValue({ rows: [], rowCount: 0 }); // ROLLBACK

    const { runMigrations } = await import("../../lib/migrations");
    await expect(runMigrations()).rejects.toThrow("syntax error");

    readFileSyncSpy.mockRestore();
  });
});

describe("rollbackMigrations()", () => {
  let existsSyncSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    resetClientMock();
    mockPoolQuery.mockReset();
    mockPoolQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    existsSyncSpy = vi.spyOn(fs, "existsSync");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns early when migrations directory does not exist", async () => {
    existsSyncSpy.mockReturnValue(false);
    const { rollbackMigrations } = await import("../../lib/migrations");

    await rollbackMigrations();

    expect(mockPoolQuery).not.toHaveBeenCalled();
  });

  it("skips a rollback when .down.sql file is missing", async () => {
    existsSyncSpy.mockImplementation((p: fs.PathLike) => {
      const pathStr = p.toString();
      // Directory exists but .down.sql file does not
      if (pathStr.endsWith(".down.sql")) return false;
      return true;
    });

    mockPoolQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // CREATE TABLE
      .mockResolvedValueOnce({ rows: [{ id: "001_init" }], rowCount: 1 }); // SELECT id FROM schema_migrations

    const { rollbackMigrations } = await import("../../lib/migrations");
    await rollbackMigrations(1);

    // No client.query should have been called (rollback skipped)
    expect(mockPoolConnect).not.toHaveBeenCalled();
  });
});
