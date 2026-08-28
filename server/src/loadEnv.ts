import dotenv from "dotenv";
import fs from "node:fs";

/** Must be the very first import in index.ts (before ./db.js or anything
 * else that reads process.env at module-load time) — ES modules run each
 * import's top-level code in source order before the importing file's own
 * code, so this has to actually be first for db.ts's createClient() call
 * to see the right values.
 *
 * Prefers .env.development, which is kept free of Turso/Resend credentials
 * on purpose (see server/.env.example and the comment inside
 * .env.development itself): with those unset, db.ts falls back to a local
 * SQLite file and email.ts skips sending, so local dev/testing never
 * touches the production database or sends a real email. Falls back to
 * .env if that file doesn't exist. Neither file exists in production —
 * Render injects real env vars directly into the process — so this is a
 * no-op there and the deployed app is unaffected. */
const devEnvPath = ".env.development";
dotenv.config({ path: fs.existsSync(devEnvPath) ? devEnvPath : ".env" });
