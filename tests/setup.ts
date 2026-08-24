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
  signedReadUrl: vi.fn(async (_b: string, key: string) => `https://signed.invalid/${key}`),
}));
