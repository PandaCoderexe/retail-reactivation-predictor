import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

const configDir = path.dirname(fileURLToPath(import.meta.url));

loadEnv({ path: path.join(configDir, ".env") });

export default defineConfig({
  schema: path.join(configDir, "prisma/schema.prisma"),
  migrations: {
    path: path.join(configDir, "prisma/migrations"),
  },
  datasource: {
    url: process.env["DIRECT_DATABASE_URL"] ?? env("DATABASE_URL"),
  },
});
