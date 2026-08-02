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

// ── Custom-domain lifecycle emails ──────────────────────────────

export function domainRenewalReminderEmail(o: { name?: string; domain: string; renewDate: string; amount: string; cardLast4?: string; fallback: string }): { subject: string; html: string } {
  return {
    subject: `Your custom domain ${o.domain} renews soon`,
    html: shell("Your custom domain renews soon", `
      ${P(`${o.name ? `Hi ${o.name},` : "Hello,"} your custom domain <b>${o.domain}</b> is scheduled to renew on <b>${o.renewDate}</b>${o.cardLast4 ? ` using the payment method ending in <b>${o.cardLast4}</b>` : ""}.`)}
      ${P(`<b>Estimated charge:</b> ${o.amount}`)}
      ${P(`No action is needed if your card is up to date. Manage your domain or update your payment method anytime.`)}
      ${P(`<a href="https://${o.fallback}" style="color:#a9843f">Your permanent Magical Moments address →</a>`)}
    `),
  };
}

export function domainPaymentFailedEmail(o: { name?: string; domain: string; fallback: string }): { subject: string; html: string } {
  return {
    subject: "Action Needed: Your Custom Domain Renewal Was Unsuccessful",
    html: shell("Your custom domain renewal was unsuccessful", `
      ${P(`Hi ${o.name || "there"}, we attempted to renew your custom domain <b>${o.domain}</b>, but your saved payment method could not be processed.`)}
      ${P(`<b>Your memories are safe.</b> Nothing has been deleted — your photos, videos, stories, messages, galleries, timelines, music, and guestbook remain protected.`)}
      ${P(`Your Magical Moments experience remains available at:<br/><a href="https://${o.fallback}" style="color:#a9843f">${o.fallback}</a>`)}
      ${P(`Please update your payment method to restore or preserve your custom domain.`)}
    `),
  };
}

export function domainFallbackEmail(o: { name?: string; domain: string; fallback: string }): { subject: string; html: string } {
  return {
    subject: "Your Memories Are Safe — Your Experience Has Moved to Its Backup Address",
    html: shell("Your memories are safe", `
      ${P(`Hi ${o.name || "there"}, your custom domain <b>${o.domain}</b> is currently inactive because its renewal payment was not completed.`)}
      ${P(`Your Magical Moments experience has automatically moved to its secure backup address:<br/><a href="https://${o.fallback}" style="color:#a9843f">${o.fallback}</a>`)}
      ${P(`<b>Nothing has been lost or deleted.</b> You may continue viewing and managing your experience through the backup address.`)}
      ${P(`To restore your custom domain, update your payment method and retry the renewal.`)}
    `),
  };
}

export function domainRestoredEmail(o: { name?: string; domain: string; fallback: string }): { subject: string; html: string } {
  return {
    subject: "Your Custom Domain Has Been Restored",
    html: shell("Your custom domain has been restored", `
      ${P(`Great news, ${o.name || "there"} — your custom domain has been renewed successfully and is active again: <b>${o.domain}</b>.`)}
      ${P(`Your Magical Moments experience is fully restored at your custom address.`)}
      ${P(`Your permanent backup address remains available for protection:<br/><a href="https://${o.fallback}" style="color:#a9843f">${o.fallback}</a>`)}
      ${P(`No further action is required.`)}
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

// ── A gold call-to-action button used across the account emails ──
function CTA(label: string, href: string): string {
  return `<p style="text-align:center;margin:22px 0 8px">
    <a href="${href}" style="display:inline-block;background:linear-gradient(135deg,#d9bd82,#c6a15a 55%,#a9843f);color:#241f2e;font-family:Arial,sans-serif;font-weight:700;text-decoration:none;padding:13px 30px;border-radius:999px;letter-spacing:0.02em">${label}</a>
  </p>`;
}
const SMALL = (t: string) => `<p style="font-size:12px;line-height:1.6;color:#9a93a2;margin:12px 0 0;font-family:Arial,sans-serif">${t}</p>`;

// ── Account & family lifecycle emails ───────────────────────────

export function verifyEmailEmail(o: { name?: string; url: string; hours: number }): { subject: string; html: string } {
  return {
    subject: "Verify your email — Magical Moments by Reign",
    html: shell("Confirm your email ✦", `
      ${P(`${o.name ? `Welcome, ${o.name}!` : "Welcome!"} Let's confirm your email so your Magical Moments account is ready.`)}
      ${CTA("Verify my email", o.url)}
      ${P(`This link expires in ${o.hours} hours. If the button doesn't work, copy and paste this link:<br/><span style="color:#a9843f;word-break:break-all">${o.url}</span>`)}
      ${SMALL("If you didn't create an account, you can safely ignore this email.")}
    `),
  };
}

export function passwordResetEmail(o: { name?: string; url: string; minutes: number }): { subject: string; html: string } {
  return {
    subject: "Reset your password — Magical Moments by Reign",
    html: shell("Reset your password", `
      ${P(`${o.name ? `Hi ${o.name},` : "Hello,"} we received a request to reset your Magical Moments password.`)}
      ${CTA("Choose a new password", o.url)}
      ${P(`For your security this link expires in ${o.minutes} minutes and can be used only once.`)}
      ${SMALL("Didn't request this? You can safely ignore this email — your password won't change.")}
    `),
  };
}

export function passwordChangedEmail(o: { name?: string; whenText: string }): { subject: string; html: string } {
  return {
    subject: "Your password was changed",
    html: shell("Your password was changed", `
      ${P(`${o.name ? `Hi ${o.name},` : "Hello,"} your Magical Moments password was successfully changed ${o.whenText}. For your protection, all other signed-in sessions were signed out.`)}
      ${P(`If this was you, no action is needed.`)}
      ${SMALL("If you didn't make this change, please reset your password immediately and contact info@magicalmomentsbyreign.com.")}
    `),
  };
}

export function securityAlertEmail(o: { name?: string; summary: string; url?: string }): { subject: string; html: string } {
  return {
    subject: "Security alert — Magical Moments by Reign",
    html: shell("A note about your account's security", `
      ${P(`${o.name ? `Hi ${o.name},` : "Hello,"} ${o.summary}`)}
      ${o.url ? CTA("Review your active sessions", o.url) : ""}
      ${SMALL("If this wasn't you, reset your password and sign out all other sessions from Account → Security.")}
    `),
  };
}

export function familyInvitationEmail(o: { inviterName: string; roleLabel: string; spaceName: string; url: string; expiresText: string }): { subject: string; html: string } {
  return {
    subject: `${o.inviterName} invited you to ${o.spaceName}`,
    html: shell("You're invited ✦", `
      ${P(`<b>${o.inviterName}</b> has invited you to join <b>${o.spaceName}</b> on Magical Moments by Reign as a <b>${o.roleLabel}</b>.`)}
      ${P("Family stays together here — shared celebrations, memories, and Moments, with the privacy controls the host chooses for you.")}
      ${CTA("View your invitation", o.url)}
      ${P(`This invitation expires ${o.expiresText}. You'll see exactly what you can access before you accept.`)}
    `),
  };
}

export function invitationAcceptedEmail(o: { hostName?: string; memberName: string; spaceName: string }): { subject: string; html: string } {
  return {
    subject: `${o.memberName} accepted your invitation`,
    html: shell("Your invitation was accepted", `
      ${P(`${o.hostName ? `Hi ${o.hostName},` : "Hello,"} good news — <b>${o.memberName}</b> has joined <b>${o.spaceName}</b>.`)}
      ${CTA("Open your family space", "https://magicalmomentsbyreign.com/account/family")}
    `),
  };
}

export function guardianApprovalRequestEmail(o: { minorName: string; url: string; expiresText: string }): { subject: string; html: string } {
  return {
    subject: `Approval needed for ${o.minorName}'s account`,
    html: shell("A young family member needs your approval", `
      ${P(`<b>${o.minorName}</b> would like to join your family on Magical Moments by Reign. As their parent or guardian, your approval is required before the account can be used.`)}
      ${P("You'll be able to choose exactly what they can see and do — and change it anytime. We never track location or monitor private activity.")}
      ${CTA("Review & set permissions", o.url)}
      ${P(`This request expires ${o.expiresText}.`)}
    `),
  };
}

export function guardianApprovalGrantedEmail(o: { minorName: string }): { subject: string; html: string } {
  return {
    subject: "Your account has been approved ✦",
    html: shell("You're approved!", `
      ${P(`Great news, ${o.minorName}! A parent or guardian has approved your Magical Moments account. You can sign in now.`)}
      ${CTA("Sign in", "https://magicalmomentsbyreign.com/login")}
    `),
  };
}

export function guardianApprovalDeclinedEmail(o: { minorName: string }): { subject: string; html: string } {
  return {
    subject: "About your account request",
    html: shell("Account request update", `
      ${P(`Hi ${o.minorName}, a parent or guardian has reviewed your account request. Access wasn't approved at this time.`)}
      ${P("If you think this was a mistake, please talk with your parent or guardian, who can approve the account for you.")}
    `),
  };
}

// ── Membership / trial / billing ────────────────────────────────

export function trialEndingEmail(o: { name?: string; planName: string; endDate: string; amount: string }): { subject: string; html: string } {
  return {
    subject: "Your Magical Preview Pass ends soon",
    html: shell("Your preview ends soon", `
      ${P(`${o.name ? `Hi ${o.name},` : "Hello,"} your Magical Preview Pass for <b>${o.planName}</b> ends on <b>${o.endDate}</b>. Unless you cancel, it will convert to a paid membership at <b>${o.amount}</b>.`)}
      ${CTA("Manage my membership", "https://magicalmomentsbyreign.com/account/billing")}
      ${SMALL("You can cancel online anytime before your preview ends — no phone call required.")}
    `),
  };
}

export function membershipConvertedEmail(o: { name?: string; planName: string; amount: string }): { subject: string; html: string } {
  return {
    subject: "Welcome to your Magical Moments membership ✦",
    html: shell("Your membership is active", `
      ${P(`${o.name ? `Welcome, ${o.name}!` : "Welcome!"} Your <b>${o.planName}</b> membership is now active${o.amount ? ` at ${o.amount}` : ""}. Everything you started during your preview is saved and ready.`)}
      ${CTA("Open my dashboard", "https://magicalmomentsbyreign.com/dashboard")}
    `),
  };
}

export function paymentFailureEmail(o: { name?: string; planName: string }): { subject: string; html: string } {
  return {
    subject: "Action needed: your payment didn't go through",
    html: shell("We couldn't process your payment", `
      ${P(`${o.name ? `Hi ${o.name},` : "Hello,"} we tried to process the payment for your <b>${o.planName}</b> membership, but it didn't go through.`)}
      ${P("<b>Your memories are safe.</b> Nothing has been deleted. Please update your payment method to keep your membership active.")}
      ${CTA("Update payment method", "https://magicalmomentsbyreign.com/account/billing")}
    `),
  };
}

export function vendorComplianceEmail(o: { businessName: string; summary: string }): { subject: string; html: string } {
  return {
    subject: "Vendor compliance update — action may be needed",
    html: shell("A note about your vendor listing", `
      ${P(`Hello ${o.businessName}, ${o.summary}`)}
      ${CTA("Review your vendor account", "https://magicalmomentsbyreign.com/account")}
      ${SMALL("Keeping your license and insurance current keeps your listing active in the marketplace.")}
    `),
  };
}

// ── Generic reminder / notification email ───────────────────────
// Covers celebration, task, appointment, education & scholarship deadlines,
// and any other in-app notification the recipient opted to receive by email.
export function reminderEmail(o: { name?: string; title: string; body: string; actionUrl?: string; actionLabel?: string }): { subject: string; html: string } {
  return {
    subject: o.title,
    html: shell(o.title, `
      ${P(`${o.name ? `Hi ${o.name},` : "Hello,"} ${o.body}`)}
      ${o.actionUrl ? CTA(o.actionLabel || "Open Magical Moments", o.actionUrl) : ""}
      ${SMALL(`You're receiving this because of your notification preferences. Manage them anytime in Account → Notifications.`)}
    `),
  };
}
