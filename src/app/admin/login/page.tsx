import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import PasswordField from "@/components/auth/PasswordField";
import { currentAdmin } from "@/lib/admin-access";
import { adminPassword } from "@/lib/admin-auth";
import { safeRedirect } from "@/lib/auth-support";
import { adminAccountLoginAction, adminLoginAction } from "../actions";
import "../../auth.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin sign in", robots: { index: false } };

const ERRORS: Record<string, string> = {
  invalid_credentials: "That email or password doesn't match our records. Please try again.",
  not_admin: "That account doesn't have admin access. Contact an Owner if you believe this is a mistake.",
  locked: "Too many attempts. Please wait a few minutes, or reset your password.",
  email_unverified: "Please verify your email before signing in to admin.",
  suspended: "This account is under review. Please contact an Owner.",
  closed: "This account is closed.",
  "1": "Incorrect password. Please try again.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; email?: string; reason?: string }>;
}) {
  const sp = await searchParams;
  const dest = safeRedirect(sp.next || "", "/admin");
  if (await currentAdmin()) redirect(dest);

  const error = sp.error && ERRORS[sp.error] ? ERRORS[sp.error] : null;
  const legacyConfigured = Boolean(adminPassword());

  return (
    <AuthShell>
      <div className="auth-card">
        <span className="auth-eyebrow">Command Center</span>
        <h1>Admin sign in</h1>
        <p className="auth-lede">Authorized Magical Moments by Reign team members only.</p>

        {sp.reason === "session" && <div className="auth-note auth-note--warn">For security, your admin session expired. Please sign in again.</div>}
        {error && <div className="auth-note auth-note--error">{error}</div>}

        {/* Preferred: account-based admin login (Account + mmr_session) */}
        <form action={adminAccountLoginAction}>
          <input type="hidden" name="next" value={dest} />
          <label className="auth-field">
            <span>Email</span>
            <input name="email" type="email" required autoFocus autoComplete="email" defaultValue={sp.email || ""} placeholder="you@magicalmomentsbyreign.com" />
          </label>
          <PasswordField name="password" label="Password" autoComplete="current-password" />
          <div className="auth-inline">
            <label className="auth-check"><input type="checkbox" name="remember" defaultChecked /><span>Remember me</span></label>
            <Link href="/forgot-password" className="auth-link">Forgot password?</Link>
          </div>
          <button type="submit" className="auth-btn">Log In to Admin Command Center</button>
        </form>

        {/* Legacy shared-password bridge (temporary; retired once an Owner exists) */}
        {legacyConfigured && (
          <details style={{ marginTop: "1.4rem" }}>
            <summary style={{ cursor: "pointer", color: "#8a8394", fontSize: "0.85rem" }}>Team access (legacy shared password)</summary>
            <form action={adminLoginAction} style={{ marginTop: "0.8rem" }}>
              <input type="hidden" name="next" value={dest} />
              <PasswordField name="password" label="Shared admin password" autoComplete="current-password" />
              <button type="submit" className="auth-btn auth-btn--ghost">Sign in with shared password</button>
            </form>
            <p className="auth-fine" style={{ textAlign: "left" }}>Temporary bridge — being retired once Owner accounts are set up.</p>
          </details>
        )}

        <p className="auth-fine">Access is role-based and enforced server-side. Unauthorized access is prohibited.</p>
      </div>
    </AuthShell>
  );
}
