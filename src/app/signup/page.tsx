import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import PasswordField from "@/components/auth/PasswordField";
import { currentAccount } from "@/lib/auth-session";
import { safeRedirect, MIN_PASSWORD_LENGTH } from "@/lib/auth-support";
import { PUBLIC_SIGNUP_ROLES } from "@/lib/auth-service";
import { roleDef } from "@/lib/roles";
import { MESSAGES } from "@/lib/account-identity";
import { signupAction } from "./actions";
import "../auth.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create your account", description: "Create your Magical Moments by Reign account." };

const ERRORS: Record<string, string> = {
  missing_fields: "Please complete all required fields so we can create your account.",
  weak_password: `Please choose a stronger password — at least ${MIN_PASSWORD_LENGTH} characters, mixing letters, numbers, and symbols.`,
  guardian_email_required: "Teen and child accounts need a parent or guardian's email for approval.",
  role_not_allowed: "Please choose a valid role. (Administrator accounts aren't created here.)",
  rate_limited: "Too many sign-up attempts from your connection. Please wait a few minutes and try again.",
  unknown: "Something went wrong. Please try again.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; role?: string; done?: string; recover?: string }>;
}) {
  const sp = await searchParams;
  const next = safeRedirect(sp.next || "", "/account");
  if (await currentAccount()) redirect(next);

  // ── Success states ──
  if (sp.done === "adult" || sp.done === "minor") {
    return (
      <AuthShell>
        <div className="auth-card auth-result">
          <div className="auth-result__icon">✦</div>
          <h1>{sp.done === "minor" ? "Almost there!" : "Welcome to the family"}</h1>
          {sp.done === "minor" ? (
            <p className="auth-lede">
              Your account was created and is <b>pending a parent or guardian's approval</b>. We've emailed them a
              secure link. You'll be able to sign in as soon as they approve — and we'll email you the moment they do.
            </p>
          ) : (
            <p className="auth-lede">
              Your account was created. We've sent a verification link to your email — please confirm your address,
              then sign in.
            </p>
          )}
          <Link href="/login" className="auth-btn" style={{ display: "inline-block", textDecoration: "none", maxWidth: 260 }}>
            Go to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  const error = sp.error && ERRORS[sp.error] ? ERRORS[sp.error] : null;

  return (
    <AuthShell>
      <div className="auth-card auth-card--wide">
        <span className="auth-eyebrow">Create your account</span>
        <h1>Join Magical Moments</h1>
        <p className="auth-lede">One account for your whole family. Capture, celebrate, and cherish forever.</p>

        {sp.recover && (
          <div className="auth-note auth-note--info">
            {MESSAGES.possibleExisting}{" "}
            <Link href="/login" className="auth-link">Sign in</Link> or{" "}
            <Link href="/forgot-password" className="auth-link">reset your password</Link>.
          </div>
        )}
        {error && <div className="auth-note auth-note--error">{error}</div>}

        <form action={signupAction}>
          <input type="hidden" name="next" value={next} />

          <label className="auth-field">
            <span>I am a…</span>
            <select name="role" defaultValue={sp.role || "family_owner"} required>
              {PUBLIC_SIGNUP_ROLES.map((r) => (
                <option key={r} value={r}>{roleDef(r).label}</option>
              ))}
            </select>
          </label>

          <div className="auth-row">
            <label className="auth-field"><span>Legal first name</span><input name="firstName" required autoComplete="given-name" /></label>
            <label className="auth-field"><span>Legal last name</span><input name="lastName" required autoComplete="family-name" /></label>
          </div>

          <div className="auth-row">
            <label className="auth-field"><span>Email</span><input name="email" type="email" required autoComplete="email" /></label>
            <label className="auth-field"><span>Mobile phone</span><input name="phone" type="tel" required autoComplete="tel" /></label>
          </div>

          <label className="auth-field"><span>Street address</span><input name="line1" required autoComplete="address-line1" /></label>
          <label className="auth-field"><span>Apartment / unit <span style={{ color: "#a79", fontWeight: 400 }}>(optional)</span></span><input name="line2" autoComplete="address-line2" /></label>
          <div className="auth-row">
            <label className="auth-field"><span>City</span><input name="city" required autoComplete="address-level2" /></label>
            <label className="auth-field"><span>State / region</span><input name="state" required autoComplete="address-level1" /></label>
          </div>
          <div className="auth-row">
            <label className="auth-field"><span>ZIP / postal code</span><input name="postal" required autoComplete="postal-code" /></label>
            <label className="auth-field"><span>Country</span><input name="country" defaultValue="US" required autoComplete="country-name" /></label>
          </div>

          <PasswordField name="password" label="Create a password" autoComplete="new-password" meter placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`} />

          <div className="auth-note auth-note--info" style={{ marginTop: "0.4rem" }}>
            <b>Teens & children:</b> enter a parent or guardian's email below. Their approval is required before the
            account can be used — and they'll always control what it can see and do.
          </div>
          <label className="auth-field">
            <span>Parent / guardian email <span style={{ color: "#a79", fontWeight: 400 }}>(required for teens & children)</span></span>
            <input name="guardianEmail" type="email" autoComplete="off" />
          </label>

          <label className="auth-check" style={{ margin: "0.4rem 0 1.2rem" }}>
            <input type="checkbox" name="acceptedTerms" required />
            <span>I agree to the <Link href="/legal/terms" className="auth-link">Terms of Service</Link> and <Link href="/legal/privacy" className="auth-link">Privacy Policy</Link>.</span>
          </label>

          <button type="submit" className="auth-btn">Create my account</button>
        </form>

        <p className="auth-alt">
          Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`} className="auth-link">Sign in</Link>
        </p>
      </div>
    </AuthShell>
  );
}
