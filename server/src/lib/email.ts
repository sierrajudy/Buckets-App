export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`RESEND_API_KEY not set — skipping email. Reset link for ${to}: ${resetUrl}`);
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
      subject: "Reset your Buckets password",
      html: `
        <p>Hi ${name},</p>
        <p>Someone requested a password reset for your Buckets account. Click below to set a new password — this link expires in 1 hour.</p>
        <p><a href="${resetUrl}">Reset your password</a></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    }),
  });

  if (!res.ok) {
    console.error("Failed to send password reset email:", res.status, await res.text().catch(() => ""));
  }
}
