import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import { verifyEmailToken } from "@/lib/auth-service";
import { resendVerificationAction } from "../login/actions";
import "../auth.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verify your email", robots: { index: false } };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthShell>
        <div className="auth-card auth-result">
          <div className="auth-result__icon">✉️</div>
          <h1>Check your inbox</h1>
          <p className="auth-lede">Open the verification link we emailed you to confirm your address.</p>
          <Link href="/login" className="auth-link">Back to sign in</Link>
        </div>
      </AuthShell>
    );
  }

  const result = await verifyEmailToken(token);

  if (result.ok) {
    return (
      <AuthShell>
        <div className="auth-card auth-result">
          <div className="auth-result__icon">✅</div>
          <h1>Email verified</h1>
          <p className="auth-lede">Thank you — your email is confirmed. You can sign in now.</p>
          <Link href="/login?registered=1" className="auth-btn" style={{ display: "inline-block", textDecoration: "none", maxWidth: 240 }}>
            Sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  const message =
    result.reason === "used"
      ? "This verification link has already been used. If your email isn't verified yet, request a new link below."
      : result.reason === "expired"
      ? "This verification link has expired. Request a fresh one below."
      : "This verification link isn't valid. Request a new one below.";

  return (
    <AuthShell>
      <div className="auth-card auth-result">
        <div className="auth-result__icon">⏳</div>
        <h1>Link needs refreshing</h1>
        <p className="auth-lede">{message}</p>
        <form action={resendVerificationAction}>
          <label className="auth-field" style={{ textAlign: "left" }}>
            <span>Your email</span>
            <input name="email" type="email" required placeholder="you@email.com" />
          </label>
          <button type="submit" className="auth-btn">Send a new verification link</button>
        </form>
      </div>
    </AuthShell>
  );
}
