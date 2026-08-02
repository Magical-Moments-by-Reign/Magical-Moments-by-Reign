import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import { forgotPasswordAction } from "./actions";
import "../auth.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Forgot password", description: "Reset your Magical Moments by Reign password." };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

  if (sent) {
    return (
      <AuthShell>
        <div className="auth-card auth-result">
          <div className="auth-result__icon">✉️</div>
          <h1>Check your email</h1>
          <p className="auth-lede">
            If an account exists for that email, we've sent a secure link to reset your password. The link expires
            shortly and can be used once.
          </p>
          <Link href="/login" className="auth-link">Back to sign in</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="auth-card">
        <span className="auth-eyebrow">Account recovery</span>
        <h1>Forgot your password?</h1>
        <p className="auth-lede">Enter your email and we'll send you a secure link to choose a new one.</p>
        <form action={forgotPasswordAction}>
          <label className="auth-field">
            <span>Email</span>
            <input name="email" type="email" required autoFocus autoComplete="email" placeholder="you@email.com" />
          </label>
          <button type="submit" className="auth-btn">Send reset link</button>
        </form>
        <p className="auth-alt">
          Remembered it? <Link href="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </AuthShell>
  );
}
