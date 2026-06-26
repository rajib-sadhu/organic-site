// Prisma CLI configuration (Prisma 7).
// DATABASE_URL is read from the schema's datasource (env("DATABASE_URL")).
// `import "dotenv/config"` loads .env for CLI commands (migrate, db seed, studio).
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Used by the Prisma CLI (migrate, studio, db seed).
    url: process.env["DATABASE_URL"],
  },
});
