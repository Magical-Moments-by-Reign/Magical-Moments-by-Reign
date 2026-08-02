import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import PasswordField from "@/components/auth/PasswordField";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-support";
import { resetPasswordAction } from "./actions";
import "../auth.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

const ERRORS: Record<string, string> = {
  invalid: "This reset link isn't valid. Please request a new one.",
  expired: "This reset link has expired. Please request a new one.",
  used: "This reset link has already been used. Please request a new one.",
  mismatch: "Those passwords don't match. Please try again.",
  weak_password: `Please choose a stronger password — at least ${MIN_PASSWORD_LENGTH} characters, mixing letters, numbers, and symbols.`,
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const token = sp.token || "";
  const error = sp.error && ERRORS[sp.error] ? ERRORS[sp.error] : null;
  const dead = sp.error === "invalid" || sp.error === "expired" || sp.error === "used";

  if (!token || dead) {
    return (
      <AuthShell>
        <div className="auth-card auth-result">
          <div className="auth-result__icon">⏳</div>
          <h1>Link needs refreshing</h1>
          <p className="auth-lede">{error || "This reset link isn't valid anymore."}</p>
          <Link href="/forgot-password" className="auth-btn" style={{ display: "inline-block", textDecoration: "none", maxWidth: 260 }}>
            Request a new link
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="auth-card">
        <span className="auth-eyebrow">Account recovery</span>
        <h1>Choose a new password</h1>
        <p className="auth-lede">For your security, this signs you out of all other devices.</p>
        {error && <div className="auth-note auth-note--error">{error}</div>}
        <form action={resetPasswordAction}>
          <input type="hidden" name="token" value={token} />
          <PasswordField name="password" label="New password" autoComplete="new-password" meter placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`} />
          <PasswordField name="confirm" label="Confirm new password" autoComplete="new-password" />
          <button type="submit" className="auth-btn">Update password</button>
        </form>
      </div>
    </AuthShell>
  );
}
