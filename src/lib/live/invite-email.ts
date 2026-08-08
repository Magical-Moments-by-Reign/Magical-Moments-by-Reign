// ── Magical Live — branded invitation content (pure builder) ────
//
// Pure functions that produce the invitation subject/html/text for email
// and the short SMS body. No network here — delivery modules call these
// and hand the result to the provider. Guests NEVER see Agora channel
// data; the only link is a Magical Moments join URL with the secure
// invite token, which is validated server-side before any token is issued.

export interface InviteContent {
  liveTitle: string;
  hostName: string;      // host / family display name
  whenText: string | null; // formatted date + time + tz, or null for "starting now"
  joinUrl: string;       // https://…/live/{roomId}?invite={token}
  message?: string | null; // optional personal note from the host
  brandBaseUrl?: string | null;
}

const GOLD = "#a67c2e";
const ESPRESSO = "#2a1d12";
const INK = "#4a3a2c";
const CREAM = "#f7f1e7";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function buildInviteEmail(c: InviteContent): { subject: string; html: string; text: string } {
  const subject = `${c.hostName} invited you to a Magical Live: ${c.liveTitle}`;
  const when = c.whenText ? esc(c.whenText) : "Starting now";
  const note = c.message?.trim()
    ? `<tr><td style="padding:0 32px 8px;"><div style="background:${CREAM};border-left:3px solid ${GOLD};border-radius:8px;padding:14px 16px;color:${INK};font-size:15px;line-height:1.55;font-style:italic;">“${esc(c.message.trim())}”</div></td></tr>`
    : "";

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#efe7d8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efe7d8;padding:28px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fffdf9;border-radius:18px;overflow:hidden;box-shadow:0 12px 30px rgba(44,33,26,.12);">
        <tr><td style="background:linear-gradient(120deg,#241710,#4a361d);padding:26px 32px;text-align:center;">
          <div style="color:#f4e7cd;font-family:Georgia,'Times New Roman',serif;font-size:20px;letter-spacing:2px;font-weight:600;">MAGICAL MOMENTS</div>
          <div style="color:${GOLD};font-size:10px;letter-spacing:5px;margin-top:4px;">BY REIGN</div>
        </td></tr>
        <tr><td style="padding:30px 32px 6px;text-align:center;">
          <div style="color:${GOLD};font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:700;">You're invited to a Magical Live</div>
          <h1 style="margin:10px 0 4px;color:${ESPRESSO};font-family:Georgia,serif;font-size:27px;line-height:1.25;">${esc(c.liveTitle)}</h1>
          <div style="color:${INK};font-size:15px;">Hosted by ${esc(c.hostName)}</div>
        </td></tr>
        <tr><td style="padding:14px 32px 4px;text-align:center;">
          <div style="display:inline-block;background:${CREAM};border:1px solid #e7dcc9;border-radius:10px;padding:10px 18px;color:${ESPRESSO};font-size:15px;font-weight:600;">🗓️ ${when}</div>
        </td></tr>
        ${note}
        <tr><td style="padding:22px 32px 8px;text-align:center;">
          <a href="${esc(c.joinUrl)}" style="display:inline-block;background:linear-gradient(135deg,#d8b25e,#a67c2e);color:${ESPRESSO};text-decoration:none;font-weight:700;font-size:16px;padding:14px 34px;border-radius:999px;">Join Magical Live →</a>
        </td></tr>
        <tr><td style="padding:6px 32px 26px;text-align:center;">
          <div style="color:${INK};font-size:13px;line-height:1.6;">No app or download required — the Live opens right in your web browser on your phone, tablet, or computer.</div>
          <div style="color:#8a7a63;font-size:11px;margin-top:14px;word-break:break-all;">If the button doesn't work, paste this link into your browser:<br>${esc(c.joinUrl)}</div>
        </td></tr>
        <tr><td style="background:${CREAM};padding:16px 32px;text-align:center;">
          <div style="color:#8a7a63;font-size:11px;line-height:1.5;">This is a private invitation from your Magical Family. Please don't forward it — the link is just for you.</div>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;

  const text = [
    `${c.hostName} invited you to a Magical Live: ${c.liveTitle}`,
    c.whenText ? `When: ${c.whenText}` : `Starting now`,
    c.message?.trim() ? `\n"${c.message.trim()}"\n` : "",
    `Join here: ${c.joinUrl}`,
    `No app or download required — it opens in your web browser.`,
    `This private invitation is just for you; please don't forward it.`,
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}

// Short branded SMS body. Never includes Agora channel data — only the
// Magical Moments join URL with the secure invite token.
export function buildInviteSms(c: Pick<InviteContent, "liveTitle" | "hostName" | "whenText" | "joinUrl">): string {
  const when = c.whenText ? ` (${c.whenText})` : "";
  return `✦ Magical Moments: ${c.hostName} invited you to "${c.liveTitle}"${when}. Join the Live (no app needed): ${c.joinUrl}`;
}

// Reminder + "live now" variants reuse the same content with a different lead-in.
export function buildReminderEmail(kind: "t24h" | "t1h" | "liveNow", c: InviteContent) {
  const base = buildInviteEmail(c);
  const lead = kind === "liveNow" ? "It's starting now" : kind === "t1h" ? "Starting in about an hour" : "Happening tomorrow";
  return { ...base, subject: `${lead}: ${c.liveTitle} — Magical Live` };
}
