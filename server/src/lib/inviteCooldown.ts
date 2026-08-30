const lastInviteAt = new Map<string, number>();
const COOLDOWN_MS = 10_000;

function key(fromUserId: string, toUserId: string, roomCode: string): string {
  return `${fromUserId}:${toUserId}:${roomCode}`;
}

/** True if fromUserId may invite toUserId to roomCode right now — and, if
 * so, immediately records this as their most recent invite so the very next
 * check enforces the cooldown. Scoped per (inviter, invitee, room): the same
 * two people being on cooldown in one room doesn't block them in another.
 * Purely in-memory and process-local — a lost invite race across a restart
 * or across server instances just means the cooldown resets, which is fine
 * for what this is protecting against (spamming one notification). */
export function tryConsumeInviteCooldown(fromUserId: string, toUserId: string, roomCode: string): boolean {
  const k = key(fromUserId, toUserId, roomCode);
  const last = lastInviteAt.get(k) ?? 0;
  const now = Date.now();
  if (now - last < COOLDOWN_MS) return false;
  lastInviteAt.set(k, now);
  return true;
}
