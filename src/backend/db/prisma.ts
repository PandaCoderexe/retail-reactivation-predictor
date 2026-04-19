import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";
import { Pool } from "pg";

const dbDir = path.dirname(fileURLToPath(import.meta.url));

for (const envPath of [
  path.join(dbDir, "../.env"),
  path.join(dbDir, "../../.env"),
]) {
  if (fs.existsSync(envPath)) {
    loadEnv({ path: envPath });
    break;
  }
}

const connectionString = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL or DIRECT_DATABASE_URL must be set.");
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaPool?: Pool;
};

const pool =
  globalForPrisma.prismaPool ??
  new Pool({
    connectionString,
  });

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ["query", "info", "warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaPool = pool;
  globalForPrisma.prisma = prisma;
}
