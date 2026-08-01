// ── Email ───────────────────────────────────────────────────────
// Server-side transactional email. Uses Resend when RESEND_API_KEY is
// set; otherwise it logs and no-ops (so the app works before email is
// configured). Never throws into a request — returns a result.
//
// Env:
//   RESEND_API_KEY   secret (resend.com) — server only
//   MAIL_FROM        e.g. "Magical Moments by Reign <info@magicalmomentsbyreign.com>"
//   ADMIN_EMAIL      where admin notifications go (default info@magicalmomentsbyreign.com)

const FROM = process.env.MAIL_FROM || "Magical Moments by Reign <info@magicalmomentsbyreign.com>";
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "info@magicalmomentsbyreign.com";

export interface SendResult { sent: boolean; skipped?: boolean; error?: string; id?: string }

export async function sendEmail(params: { to: string; subject: string; html: string; replyTo?: string }): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[email] (not configured) → ${params.to}: ${params.subject}`);
    return { sent: false, skipped: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ from: FROM, to: params.to, subject: params.subject, html: params.html, reply_to: params.replyTo }),
    });
    const data = await res.json();
    if (!res.ok) return { sent: false, error: data?.message || "send failed" };
    return { sent: true, id: data?.id };
  } catch (e) {
    return { sent: false, error: (e as Error).message };
  }
}

// ── Branded HTML shell ──────────────────────────────────────────
function shell(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f7f3ec;font-family:Georgia,'Times New Roman',serif;color:#2a2630">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:22px;letter-spacing:6px;color:#211d29">MAGICAL MOMENTS</div>
      <div style="font-size:12px;letter-spacing:8px;color:#a9843f">BY REIGN</div>
    </div>
    <div style="background:#fff;border:1px solid #e6e1d8;border-radius:16px;padding:28px 26px">
      <h1 style="font-size:22px;color:#211d29;margin:0 0 14px">${title}</h1>
      ${body}
    </div>
    <p style="text-align:center;color:#9a93a2;font-size:12px;margin-top:20px;font-family:Arial,sans-serif">
      Capture. Celebrate. Cherish Forever. · Magical Moments by Reign
    </p>
  </div></body></html>`;
}

const P = (t: string) => `<p style="font-size:15px;line-height:1.6;color:#4a4551;margin:0 0 12px;font-family:Arial,sans-serif">${t}</p>`;

// ── Templates ───────────────────────────────────────────────────

export function purchaseThankYouEmail(o: { name?: string; number: string; items: string[]; total: string }): { subject: string; html: string } {
  return {
    subject: `Thank you! Your Magical Moment order ${o.number}`,
    html: shell("Thank you for your order ✦", `
      ${P(`${o.name ? `Dear ${o.name},` : "Hello,"} thank you for choosing Magical Moments by Reign — we can't wait to help you preserve this moment beautifully.`)}
      ${P(`<b>Order:</b> ${o.number}<br/><b>Includes:</b> ${o.items.join(", ")}<br/><b>Total:</b> ${o.total}`)}
      <h2 style="font-size:16px;color:#211d29;margin:18px 0 8px">How to build the most amazing site ever</h2>
      ${P("1. <b>Sign in to your dashboard</b> to start your experience.")}
      ${P("2. <b>Choose your story</b> and answer a few guided questions — Ask Magical designs it for you.")}
      ${P("3. <b>Upload your memories</b> — photos, videos, and the details that make it yours.")}
      ${P("4. <b>Preview, perfect, and publish</b> — you'll get a unique link (and custom domain where included).")}
      ${P("5. <b>Keep it growing</b> — add milestones and new memories anytime.")}
      ${P(`<a href="https://magicalmomentsbyreign.com/dashboard" style="color:#a9843f">Open your dashboard →</a>`)}
      ${P("Reply to this email anytime — we're here to help.")}
    `),
  };
}

export function adminOrderNotifyEmail(o: { number: string; email: string; total: string; items: string[] }): { subject: string; html: string } {
  return {
    subject: `New order ${o.number} — ${o.total}`,
    html: shell("New order received", `
      ${P(`<b>Order:</b> ${o.number}<br/><b>Customer:</b> ${o.email}<br/><b>Total:</b> ${o.total}<br/><b>Items:</b> ${o.items.join(", ")}`)}
    `),
  };
}

export function customWebsiteReceivedEmail(o: { name: string; number: string }): { subject: string; html: string } {
  return {
    subject: `We received your custom website request ${o.number}`,
    html: shell("Your custom website request ✦", `
      ${P(`Dear ${o.name}, thank you for your interest in a custom, luxury website by Magical Moments by Reign.`)}
      ${P(`<b>Reference:</b> ${o.number}`)}
      ${P("<b>What happens next:</b>")}
      ${P("1. Our team personally reviews your request.")}
      ${P("2. Once we <b>accept your project</b>, you'll receive a confirmation email — please be on standby for a phone call so we can get started.")}
      ${P("3. We'll send you a short intake form to gather everything we need to craft the most amazing site ever.")}
      ${P("In the meantime, start gathering your brand colors, logo, favorite websites, and the goals for your new site.")}
      ${P("We're honored to build something beautiful with you.")}
    `),
  };
}

export function customWebsiteAcceptedEmail(o: { name: string; number: string; jotformUrl?: string }): { subject: string; html: string } {
  return {
    subject: `Great news — we've accepted your custom website project ${o.number}`,
    html: shell("Your project is accepted ✦", `
      ${P(`Dear ${o.name}, wonderful news — we've <b>accepted your custom website project</b> (${o.number}).`)}
      ${P("<b>Please be on standby for a phone call</b> so we can get started and bring your vision to life.")}
      ${o.jotformUrl ? P(`To help us prepare, please complete your project intake form: <a href="${o.jotformUrl}" style="color:#a9843f">Start your intake form →</a>`) : P("We'll send your project intake form shortly.")}
      ${P("Thank you for trusting Magical Moments by Reign with your business's online home.")}
    `),
  };
}

export function adminCustomWebsiteNotifyEmail(o: { number: string; name: string; email: string; business?: string; details: string }): { subject: string; html: string } {
  return {
    subject: `New custom website request ${o.number} — ${o.business || o.name}`,
    html: shell("New custom website request", `
      ${P(`<b>Ref:</b> ${o.number}<br/><b>Name:</b> ${o.name}<br/><b>Email:</b> ${o.email}<br/><b>Business:</b> ${o.business || "—"}`)}
      ${P(`<b>Details:</b><br/>${o.details.replace(/\n/g, "<br/>")}`)}
      ${P(`<a href="https://magicalmomentsbyreign.com/admin/custom-websites" style="color:#a9843f">Open the admin →</a>`)}
    `),
  };
}
