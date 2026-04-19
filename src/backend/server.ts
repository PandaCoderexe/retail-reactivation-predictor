import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import express from "express";
import authRoutes from "./routers/auth.route.js";
import predictRoutes from "./routers/predict.route.js";
import cookieParser from "cookie-parser";

const serverDir = path.dirname(fileURLToPath(import.meta.url));

for (const envPath of [
  path.join(serverDir, ".env"),
  path.join(serverDir, "../.env"),
]) {
  if (fs.existsSync(envPath)) {
    loadEnv({ path: envPath });
    break;
  }
}

const app = express();
const port = Number(process.env.PORT ?? 4000);
const allowedOrigins = new Set([
  process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
]);

app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;

  if (requestOrigin && allowedOrigins.has(requestOrigin)) {
    res.header("Access-Control-Allow-Origin", requestOrigin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Vary", "Origin");
  }

  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  );
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

app.use(express.json());
app.use(cookieParser());

app.use("/auth", authRoutes);
app.use("/predict", predictRoutes);

app.get("/", (req, res) => {
  res.send("Hello, you are on my server");
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
