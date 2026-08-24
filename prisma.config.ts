import "dotenv/config";
import { defineConfig } from "prisma/config";

/*
  Migrations connect as the schema owner; the running application connects as a
  role that can only read and write rows. Keeping those separate means a bug or
  compromise in the app cannot drop or alter a table.

  MIGRATE_DATABASE_URL is optional — without it this falls back to
  DATABASE_URL, which keeps a fresh clone working before roles are split.
*/
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["MIGRATE_DATABASE_URL"] ?? process.env["DATABASE_URL"],
  },
});
