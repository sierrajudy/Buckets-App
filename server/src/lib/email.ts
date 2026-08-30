const APP_URL = process.env.APP_URL || "https://buckets-7til.onrender.com";

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`RESEND_API_KEY not set — skipping email to ${to}: ${subject}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "Buckets <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    console.error(`Failed to send email to ${to}:`, res.status, await res.text().catch(() => ""));
  }
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string): Promise<void> {
  await sendEmail(
    to,
    "Reset your Buckets password",
    `
      <p>Hi ${name},</p>
      <p>Someone requested a password reset for your Buckets account. Click below to set a new password — this link expires in 1 hour.</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  );
}

export async function sendRoundStartEmail(
  to: string,
  name: string,
  opts: { players: string[]; course: string; roomCode: string },
): Promise<void> {
  await sendEmail(
    to,
    `⛳ A round just started at ${opts.course}`,
    `
      <p>Hi ${name},</p>
      <p>${opts.players.join(", ")} just started a round at <strong>${opts.course}</strong>.</p>
      <p>Room code: <strong>${opts.roomCode}</strong></p>
      <p><a href="${APP_URL}">Open Buckets</a> and join as a spectator to watch the scorecard live.</p>
      <p style="color: #888; font-size: 12px;">You're getting this because you opted into round-start emails. Turn it off anytime in your Buckets profile.</p>
    `,
  );
}

/** Sent when a player invites a friend to spectate and that friend isn't
 * currently online to get the live pop-up instead (see presence.ts). The
 * link carries ?code= the same way a shared room-code link already does
 * elsewhere in the app (see Home.tsx's codeFromLink), so opening it drops
 * the room code straight into the join form. */
export async function sendSpectateInviteEmail(
  to: string,
  name: string,
  opts: { inviterName: string; roomCode: string },
): Promise<void> {
  const link = `${APP_URL}/?code=${opts.roomCode}`;
  await sendEmail(
    to,
    `⛳ ${opts.inviterName} invited you to watch a live game of Buckets`,
    `
      <p>Hi ${name},</p>
      <p>${opts.inviterName} has invited you to spectate a live game of Buckets! Enter the room code or click the link below to watch the game.</p>
      <p>Room code: <strong>${opts.roomCode}</strong></p>
      <p><a href="${link}">${link}</a></p>
    `,
  );
}

export async function sendStandingsEmail(
  to: string,
  name: string,
  opts: { course: string; winner: string; players: { name: string; total: number }[] },
): Promise<void> {
  const rows = [...opts.players]
    .sort((a, b) => b.total - a.total)
    .map((p) => `<li>${p.name}${p.name === opts.winner ? " 🏆" : ""} — ${p.total} pts</li>`)
    .join("");

  await sendEmail(
    to,
    `🏆 ${opts.winner} won at ${opts.course}`,
    `
      <p>Hi ${name},</p>
      <p>A round just wrapped up at <strong>${opts.course}</strong>. Final standings:</p>
      <ul>${rows}</ul>
      <p><a href="${APP_URL}">Open Buckets</a> to see the full breakdown.</p>
      <p style="color: #888; font-size: 12px;">You're getting this because you opted into standings emails. Turn it off anytime in your Buckets profile.</p>
    `,
  );
}
