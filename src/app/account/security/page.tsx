import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { listActiveSessions } from "@/lib/auth-session";
import PasswordField from "@/components/auth/PasswordField";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-support";
import { changePasswordAction, logoutOthersAction, revokeSessionAction } from "../actions";

export const metadata: Metadata = { title: "Security", robots: { index: false } };

const PW_MSG: Record<string, { tone: string; text: string }> = {
  ok: { tone: "ok", text: "Your password was changed. Other devices were signed out." },
  mismatch: { tone: "error", text: "Those passwords don't match. Please try again." },
  wrong_current: { tone: "error", text: "Your current password is incorrect." },
  weak_password: { tone: "error", text: `Please choose a stronger password — at least ${MIN_PASSWORD_LENGTH} characters, mixing letters, numbers, and symbols.` },
};

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ pw?: string; signedout?: string }> }) {
  const acct = await requireAccount();
  const sp = await searchParams;
  const [sessions, data] = await Promise.all([
    listActiveSessions(acct.id, acct.sessionTokenHash),
    prisma.account.findUnique({ where: { id: acct.id }, select: { googleSub: true, appleSub: true } }),
  ]);
  const pw = sp.pw && PW_MSG[sp.pw] ? PW_MSG[sp.pw] : null;

  return (
    <>
      <h1>Security</h1>
      <p>Manage your password, your signed-in devices, and your privacy.</p>

      {/* ── Password ── */}
      <h2>Password</h2>
      {pw && <div className={`auth-note auth-note--${pw.tone}`}>{pw.text}</div>}
      <form action={changePasswordAction} style={{ maxWidth: 420 }}>
        <PasswordField name="current" label="Current password" autoComplete="current-password" />
        <PasswordField name="next" label="New password" autoComplete="new-password" meter placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`} />
        <PasswordField name="confirm" label="Confirm new password" autoComplete="new-password" />
        <button type="submit" className="auth-btn" style={{ maxWidth: 220 }}>Update password</button>
      </form>

      {/* ── Active sessions ── */}
      <h2 id="sessions">Active sessions</h2>
      {sp.signedout === "others" && <div className="auth-note auth-note--ok">Signed out of all other devices.</div>}
      {sp.signedout === "one" && <div className="auth-note auth-note--ok">That session was signed out.</div>}
      {sessions.map((s) => (
        <div className="acct__row" key={s.id}>
          <span className="acct__v">
            {s.device} {s.current && <span className="chip chip--ok">this device</span>}
            <span style={{ display: "block", fontSize: "0.78rem", color: "#a1917a", fontWeight: 400 }}>
              Signed in {s.createdAt.toLocaleString()} · expires {s.expiresAt.toLocaleDateString()}
            </span>
          </span>
          {!s.current && (
            <form action={revokeSessionAction}>
              <input type="hidden" name="sessionId" value={s.id} />
              <button type="submit" className="auth-btn auth-btn--ghost" style={{ width: "auto", padding: "0.4rem 0.9rem", fontSize: "0.85rem" }}>Sign out</button>
            </form>
          )}
        </div>
      ))}
      {sessions.length > 1 && (
        <form action={logoutOthersAction} style={{ marginTop: "0.8rem" }}>
          <button type="submit" className="auth-btn auth-btn--danger" style={{ maxWidth: 260 }}>Sign out all other devices</button>
        </form>
      )}

      {/* ── Connected accounts ── */}
      <h2 id="connected">Connected accounts</h2>
      <div className="acct__row">
        <span className="acct__v">Google</span>
        <span className="acct__v"><span className={`chip ${data?.googleSub ? "chip--ok" : "chip--muted"}`}>{data?.googleSub ? "connected" : "not connected"}</span></span>
      </div>
      <div className="acct__row">
        <span className="acct__v">Apple</span>
        <span className="acct__v"><span className={`chip ${data?.appleSub ? "chip--ok" : "chip--muted"}`}>{data?.appleSub ? "connected" : "not connected"}</span></span>
      </div>
      <p style={{ fontSize: "0.82rem", color: "#a1917a" }}>Social sign-in stores only the provider's account identifier — never your password or tokens.</p>

      {/* ── Privacy ── */}
      <h2 id="privacy">Privacy</h2>
      <p style={{ color: "#8a7a63" }}>
        Your memories are yours. We <b>never</b> track your location, listen in, or monitor private activity.
        Passwords and security tokens are stored only as one-way hashes, and we never sell your data.
      </p>
      <p><Link href="/legal/privacy" className="auth-link">Read our Privacy Policy →</Link></p>
    </>
  );
}
