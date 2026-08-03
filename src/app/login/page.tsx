import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import PasswordField from "@/components/auth/PasswordField";
import { currentAccount } from "@/lib/auth-session";
import { safeRedirect } from "@/lib/auth-support";
import { loginAction, resendVerificationAction } from "./actions";
import "../auth.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in", description: "Sign in to your Magical Moments by Reign account." };

const ERRORS: Record<string, string> = {
  invalid_credentials: "That email or password doesn't match our records. Please try again.",
  locked: "Too many attempts. For your security, please wait a few minutes before trying again — or reset your password.",
  email_unverified: "Please verify your email to finish setting up your account. We can send you a new verification link.",
  guardian_pending: "Your account is waiting for a parent or guardian to approve it. We'll email you the moment it's approved.",
  suspended: "Your account is temporarily under review. Please contact support and we'll help you right away.",
  closed: "This account is closed. Please contact support if you believe this is a mistake.",
  vendor_inactive: "Your vendor membership is inactive. Renew or update your credentials to restore your listing.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; email?: string; resent?: string; registered?: string; reset?: string }>;
}) {
  const sp = await searchParams;
  const next = safeRedirect(sp.next || "", "/account");

  // Already signed in → go where they were headed.
  if (await currentAccount()) redirect(next);

  const error = sp.error && ERRORS[sp.error] ? ERRORS[sp.error] : null;

  return (
    <AuthShell>
      <div className="auth-card">
        <span className="auth-eyebrow">Welcome back</span>
        <h1>Sign in</h1>
        <p className="auth-lede">Your memories, your family, your Moments — all in one place.</p>

        {sp.registered && (
          <div className="auth-note auth-note--ok">
            Your account was created. Please check your email to verify your address before signing in.
          </div>
        )}
        {sp.reset && (
          <div className="auth-note auth-note--ok">Your password was updated. Please sign in with your new password.</div>
        )}
        {sp.resent === "failed" ? (
          <div className="auth-note auth-note--error">
            We couldn&apos;t send the verification email right now. Please try again shortly or contact support at{" "}
            <a href="mailto:info@magicalmomentsbyreign.com" className="auth-link">info@magicalmomentsbyreign.com</a>.
          </div>
        ) : sp.resent ? (
          <div className="auth-note auth-note--info">If an account exists for that email, a new verification link is on its way.</div>
        ) : null}
        {error && <div className="auth-note auth-note--error">{error}</div>}

        <form action={loginAction}>
          <input type="hidden" name="next" value={next} />
          <label className="auth-field">
            <span>Email</span>
            <input name="email" type="email" required autoComplete="email" autoFocus defaultValue={sp.email || ""} placeholder="you@email.com" />
          </label>

          <PasswordField name="password" label="Password" autoComplete="current-password" />

          <div className="auth-inline">
            <label className="auth-check">
              <input type="checkbox" name="remember" defaultChecked />
              <span>Remember me</span>
            </label>
            <Link href="/forgot-password" className="auth-link">Forgot password?</Link>
          </div>

          <button type="submit" className="auth-btn">Sign in</button>
        </form>

        {(sp.error === "email_unverified" || sp.resent) && sp.email && (
          <form action={resendVerificationAction} style={{ marginTop: "0.9rem" }}>
            <input type="hidden" name="email" value={sp.email} />
            <button type="submit" className="auth-btn auth-btn--ghost">
              {sp.resent === "failed" ? "Try sending the verification email again" : "Resend verification email"}
            </button>
          </form>
        )}

        <p className="auth-alt">
          New to Magical Moments? <Link href={`/signup?next=${encodeURIComponent(next)}`} className="auth-link">Create your account</Link>
        </p>
      </div>
    </AuthShell>
  );
}
