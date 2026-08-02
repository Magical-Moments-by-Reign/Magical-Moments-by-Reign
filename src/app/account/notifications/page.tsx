import type { Metadata } from "next";
import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { NOTIFICATION_TYPES, channelAvailable, type ChannelPrefs, type NotificationType } from "@/lib/notifications";
import { ensureProviders } from "@/lib/notify";
import { isChildRole } from "@/lib/roles";
import { savePreferencesAction } from "./actions";

export const metadata: Metadata = { title: "Notification preferences", robots: { index: false } };

export default async function NotificationPrefsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const acct = await requireAccount();
  const sp = await searchParams;
  ensureProviders();
  const emailReady = channelAvailable("email");
  const minor = isChildRole(acct.role);

  const rows = await prisma.notificationPreference.findMany({ where: { accountId: acct.id }, select: { type: true, channels: true } });
  const prefs: Partial<Record<NotificationType, ChannelPrefs>> = {};
  for (const r of rows) {
    try { prefs[r.type as NotificationType] = JSON.parse(r.channels) as ChannelPrefs; } catch { /* ignore */ }
  }

  return (
    <>
      <h1>Notifications</h1>
      <p>Choose how you'd like to hear from us. In-app notifications are always on — they're your source of truth.</p>

      {sp.saved && <div className="auth-note auth-note--ok" style={{ marginTop: "1rem" }}>Your preferences were saved.</div>}
      {minor && (
        <div className="auth-note auth-note--info" style={{ marginTop: "1rem" }}>
          For your safety, your notifications stay in-app only unless a parent or guardian enables more.
        </div>
      )}

      <form action={savePreferencesAction}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "0.8rem" }}>
          <thead>
            <tr style={{ textAlign: "left", fontSize: "0.78rem", color: "#8a8394", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              <th style={{ padding: "0.5rem 0" }}>Type</th>
              <th style={{ padding: "0.5rem 0", textAlign: "center" }}>In-app</th>
              <th style={{ padding: "0.5rem 0", textAlign: "center" }}>Email</th>
              <th style={{ padding: "0.5rem 0", textAlign: "center" }}>SMS</th>
              <th style={{ padding: "0.5rem 0", textAlign: "center" }}>Push</th>
            </tr>
          </thead>
          <tbody>
            {NOTIFICATION_TYPES.map((t) => {
              const p = prefs[t.id] ?? {};
              const emailDefault = p.email !== undefined ? p.email === true : t.defaultChannels.includes("email");
              return (
                <tr key={t.id} style={{ borderTop: "1px solid #f0e9db" }}>
                  <td style={{ padding: "0.7rem 0", fontWeight: 600, color: "#3a3446" }}>{t.label}</td>
                  <td style={{ textAlign: "center" }}><input type="checkbox" checked readOnly disabled aria-label="In-app always on" style={{ accentColor: "#c6a15a" }} /></td>
                  <td style={{ textAlign: "center" }}>
                    {minor || !emailReady ? (
                      <span className="chip chip--muted" title={minor ? "In-app only for minors" : "Email delivery not configured yet"}>—</span>
                    ) : (
                      <input type="checkbox" name={`email_${t.id}`} defaultChecked={emailDefault} style={{ accentColor: "#c6a15a" }} />
                    )}
                  </td>
                  <td style={{ textAlign: "center" }}><span className="chip chip--muted">soon</span></td>
                  <td style={{ textAlign: "center" }}><span className="chip chip--muted">soon</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <p style={{ fontSize: "0.8rem", color: "#8a8394", margin: "0.9rem 0 1rem" }}>
          {emailReady
            ? "Email delivery is active. SMS and push are coming soon — they're shown here but not yet active."
            : "SMS and push are coming soon. Email delivery activates once our email provider is connected. Until then, everything still arrives in-app."}
        </p>
        <button type="submit" className="auth-btn" style={{ maxWidth: 220 }}>Save preferences</button>
      </form>
    </>
  );
}
