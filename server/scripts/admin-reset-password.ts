import "dotenv/config";
import { db } from "../src/db.js";
import { hashPassword } from "../src/lib/auth.js";

const [, , email, newPassword] = process.argv;

if (!email || !newPassword) {
  console.error("Usage: npx tsx scripts/admin-reset-password.ts <email> <newPassword>");
  process.exit(1);
}
if (newPassword.length < 6) {
  console.error("Password must be at least 6 characters.");
  process.exit(1);
}

async function main() {
  const result = await db.execute({
    sql: "SELECT id, name FROM users WHERE email = ? COLLATE NOCASE",
    args: [email],
  });
  const row = result.rows[0] as unknown as { id: string; name: string } | undefined;
  if (!row) {
    console.error(`No account found for ${email}`);
    process.exit(1);
  }

  await db.execute({
    sql: "UPDATE users SET password_hash = ? WHERE id = ?",
    args: [hashPassword(newPassword), row.id],
  });
  await db.execute({ sql: "DELETE FROM sessions WHERE user_id = ?", args: [row.id] });

  console.log(`Password updated for ${row.name} (${email}). They've been logged out everywhere.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
