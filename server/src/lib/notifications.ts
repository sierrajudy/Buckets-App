import { db } from "../db.js";
import { sendRoundStartEmail, sendStandingsEmail } from "./email.js";
import type { RoundSummary } from "../rooms/types.js";

interface Recipient {
  email: string;
  name: string;
}

async function optedInExcluding(
  column: "email_round_start" | "email_standings",
  exclude: string[],
): Promise<Recipient[]> {
  const sql =
    column === "email_round_start"
      ? "SELECT email, name FROM users WHERE email_round_start = 1"
      : "SELECT email, name FROM users WHERE email_standings = 1";
  const result = await db.execute(sql);
  const excludeLower = new Set(exclude.map((n) => n.toLowerCase()));
  return (result.rows as unknown as Recipient[]).filter((u) => !excludeLower.has(u.name.toLowerCase()));
}

/** Fire-and-forget: emails everyone who opted into round-start notifications
 * (except the players themselves) that a round just began, so they can come
 * spectate. Failures are logged, not thrown — a flaky email shouldn't affect
 * the room. */
export async function notifyRoundStarted(opts: { players: string[]; course: string; roomCode: string }): Promise<void> {
  try {
    const recipients = await optedInExcluding("email_round_start", opts.players);
    await Promise.allSettled(
      recipients.map((r) => sendRoundStartEmail(r.email, r.name, { players: opts.players, course: opts.course, roomCode: opts.roomCode })),
    );
  } catch (err) {
    console.error("Failed to send round-start notifications:", err);
  }
}

/** Fire-and-forget: emails everyone who opted into standings notifications
 * (except the players themselves) the final results of a just-finished
 * round. */
export async function notifyStandings(round: RoundSummary): Promise<void> {
  try {
    const recipients = await optedInExcluding("email_standings", round.players);
    await Promise.allSettled(
      recipients.map((r) =>
        sendStandingsEmail(r.email, r.name, {
          course: round.course,
          winner: round.winner,
          players: round.players.map((p) => ({ name: p, total: round.totals[p] ?? 0 })),
        }),
      ),
    );
  } catch (err) {
    console.error("Failed to send standings notifications:", err);
  }
}
