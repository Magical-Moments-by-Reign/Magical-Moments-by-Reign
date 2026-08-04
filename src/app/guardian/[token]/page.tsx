import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import { getGuardianApprovalByToken } from "@/lib/auth-service";
import { GUARDIAN_CONTROLLED_PERMISSIONS, minorDefaultPermissions } from "@/lib/guardian";
import { roleDef, type PlatformRole } from "@/lib/roles";
import { guardianDecisionAction } from "./actions";
import "../../auth.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Approve a young family member", robots: { index: false } };

export default async function GuardianPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const rec = await getGuardianApprovalByToken(token);

  if (sp.done) {
    const approved = sp.done === "approved";
    return (
      <AuthShell>
        <div className="auth-card auth-result">
          <div className="auth-result__icon">{approved ? "✅" : "💛"}</div>
          <h1>{approved ? "Account approved" : "Decision recorded"}</h1>
          <p className="auth-lede">
            {approved
              ? "Thank you. The account is now active and we've let them know they can sign in. You can adjust their permissions anytime from your account."
              : "Thank you. We've recorded your decision and let them know. No account access was granted."}
          </p>
          <Link href="/" className="auth-link">Return home</Link>
        </div>
      </AuthShell>
    );
  }

  const expired = !rec || rec.status === "expired" || rec.expiresAt.toISOString() < new Date().toISOString();
  const decided = rec && (rec.status === "approved" || rec.status === "declined");

  if (!rec || expired || decided) {
    return (
      <AuthShell>
        <div className="auth-card auth-result">
          <div className="auth-result__icon">⏳</div>
          <h1>{decided ? "Already handled" : "Request unavailable"}</h1>
          <p className="auth-lede">
            {decided
              ? "This approval request has already been decided."
              : "This approval request isn't valid or has expired. Please ask them to sign up again so we can send a fresh request."}
          </p>
          <Link href="/" className="auth-link">Return home</Link>
        </div>
      </AuthShell>
    );
  }

  const minorName = `${rec.minor.firstName} ${rec.minor.lastName}`.trim();
  const role = rec.minor.platformRole as PlatformRole;
  const defaults = minorDefaultPermissions(role);

  return (
    <AuthShell>
      <div className="auth-card auth-card--wide">
        <span className="auth-eyebrow">Parent / guardian approval</span>
        <h1>Approve {rec.minor.firstName}'s account</h1>
        <p className="auth-lede">
          <b>{minorName}</b> ({roleDef(role).label}) would like to join your family on Magical Moments by Reign. As their
          parent or guardian, you decide whether to approve — and exactly what they can see and do.
        </p>

        <div className="auth-note auth-note--info">
          We never track location or monitor private activity. You can change these permissions, pause, or remove access
          at any time from your account.
        </div>

        <form action={guardianDecisionAction}>
          <input type="hidden" name="token" value={token} />

          <h2 style={{ fontSize: "1.05rem", margin: "1rem 0 0.5rem", color: "#3f3424" }}>What {rec.minor.firstName} can do</h2>
          <div className="perm-grid">
            {GUARDIAN_CONTROLLED_PERMISSIONS.map((p) => (
              <label className="perm-item" key={p.key}>
                <input type="checkbox" name={`perm_${p.key}`} defaultChecked={defaults[p.key] === true} />
                <span>
                  <span className="perm-item__label">{p.label}</span>
                  <span className="perm-item__help">{p.help}</span>
                </span>
              </label>
            ))}
          </div>

          <div style={{ display: "grid", gap: "0.7rem" }}>
            <button type="submit" name="choice" value="approve" className="auth-btn">Approve & set permissions</button>
            <button type="submit" name="choice" value="decline" className="auth-btn auth-btn--danger">Decline access</button>
          </div>
        </form>
      </div>
    </AuthShell>
  );
}
