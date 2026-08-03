import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import PasswordField from "@/components/auth/PasswordField";
import { currentAccount } from "@/lib/auth-session";
import { isStaffRole } from "@/lib/roles";
import { safeRedirect } from "@/lib/auth-support";
import { vendorLoginAction } from "./actions";
import "../../auth.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Vendor sign in", description: "Sign in to your Magical Moments by Reign vendor workspace." };

const ERRORS: Record<string, string> = {
  invalid_credentials: "That email or password doesn't match our records. Please try again.",
  locked: "Too many attempts. For your security, please wait a few minutes — or reset your password.",
  email_unverified: "Please verify your email to finish setting up your account.",
  guardian_pending: "This account is awaiting approval.",
  suspended: "Your account is temporarily under review. Please contact our team.",
  closed: "This account is closed. Please contact our team.",
  vendor_inactive: "Your vendor membership is inactive. Sign in to see what's needed to restore it.",
};

export default async function VendorLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; email?: string }>;
}) {
  const sp = await searchParams;
  const next = safeRedirect(sp.next || "", "/vendors/dashboard");
  const acct = await currentAccount();
  if (acct && (acct.role === "vendor" || isStaffRole(acct.role))) redirect(next);

  const error = sp.error && ERRORS[sp.error] ? ERRORS[sp.error] : null;

  return (
    <AuthShell>
      <div className="auth-card">
        <span className="auth-eyebrow">Vendor workspace</span>
        <h1>Vendor sign in</h1>
        <p className="auth-lede">Manage your profile, documents, bookings, and reviews — your professional home on Magical Moments by Reign.</p>

        {error && <div className="auth-note auth-note--error">{error}</div>}

        <form action={vendorLoginAction}>
          <input type="hidden" name="next" value={next} />
          <label className="auth-field">
            <span>Business email</span>
            <input name="email" type="email" required autoComplete="email" autoFocus defaultValue={sp.email || ""} placeholder="you@yourbusiness.com" />
          </label>
          <PasswordField name="password" label="Password" autoComplete="current-password" />
          <div className="auth-inline">
            <span />
            <Link href="/forgot-password" className="auth-link">Forgot password?</Link>
          </div>
          <button type="submit" className="auth-btn">Sign in to Vendor Portal</button>
        </form>

        <p className="auth-alt">
          New here? <Link href="/vendors/apply" className="auth-link">Become a Vendor</Link> · <Link href="/vendors" className="auth-link">Vendor Marketplace</Link>
        </p>
        <p className="auth-fine">Vendors are independent businesses. Magical Moments by Reign connects families with vendors but does not employ, insure, or guarantee them.</p>
      </div>
    </AuthShell>
  );
}
