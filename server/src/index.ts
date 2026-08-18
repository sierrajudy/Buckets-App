import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { initDb } from "./db.js";
import { roundsRouter } from "./routes/rounds.js";
import { standingsRouter } from "./routes/standings.js";
import { authRouter } from "./routes/auth.js";
import { myRoundsRouter } from "./routes/myRounds.js";
import { getUserByToken } from "./lib/auth.js";
import { registerRoomHandlers } from "./rooms/socketHandlers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  await initDb();

  const app = express();
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRouter);
  app.use("/api/rounds", roundsRouter);
  app.use("/api/standings", standingsRouter);
  app.use("/api/my-rounds", myRoundsRouter);

  const clientDist = path.join(__dirname, "..", "..", "client", "dist");
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: "*" } });

  io.use(async (socket, next) => {
    const user = await getUserByToken(socket.handshake.auth?.token);
    if (!user) return next(new Error("unauthorized"));
    socket.data.user = user;
    next();
  });

  registerRoomHandlers(io);

  httpServer.listen(PORT, () => {
    console.log(`Buckets server listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
