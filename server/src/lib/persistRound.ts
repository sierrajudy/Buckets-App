import { db } from "../db.js";
import type { RoundSummary } from "../rooms/types.js";

export async function persistRound(round: RoundSummary): Promise<void> {
  await db.execute({
    sql: `INSERT INTO rounds
      (id, course, starting_hole, players, holes, totals, hole_in_one_player, putt_off_used, putt_off_winner, winner, losers, game_mode, teams, winners, high_low)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      round.id,
      round.course,
      round.startingHole,
      JSON.stringify(round.players),
      JSON.stringify(round.holes),
      JSON.stringify(round.totals),
      round.holeInOnePlayer ?? null,
      round.puttOff?.used ? 1 : 0,
      round.puttOff?.winner ?? null,
      round.winner,
      JSON.stringify(round.losers ?? []),
      round.gameMode,
      round.teams ? JSON.stringify(round.teams) : null,
      JSON.stringify(round.winners ?? []),
      round.highLow ? JSON.stringify(round.highLow) : null,
    ],
  });
}
