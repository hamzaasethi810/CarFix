import "dotenv/config";

// Tests truncate tables, so they must never point at the development database.
if (!process.env.TEST_DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL must be set. Tests refuse to run against the dev database.");
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

// Storage is stubbed so the security tests exercise authorization and business
// rules without needing a live bucket. Receipt-deletion assertions inspect the
// calls recorded here.
vi.mock("../lib/storage/objects", () => ({
  putObject: vi.fn(async () => undefined),
  deleteObject: vi.fn(async () => undefined),
  /*
    Files are read back through the app now rather than handed out as signed
    bucket URLs, so the mock returns bytes. A one-pixel PNG stands in for
    whatever was stored.
  */
  getObjectBytes: vi.fn(async () => ({
    bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    contentType: "image/png",
  })),
}));
