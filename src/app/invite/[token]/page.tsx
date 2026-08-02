import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import { getInvitationByToken } from "@/lib/auth-service";
import { currentAccount } from "@/lib/auth-session";
import { invitationExpired } from "@/lib/auth-support";
import { roleDef } from "@/lib/roles";
import { acceptInviteAction, declineInviteAction } from "./actions";
import "../../auth.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your invitation", robots: { index: false } };

const ACCEPT_ERRORS: Record<string, string> = {
  invalid: "This invitation isn't valid.",
  revoked: "This invitation is no longer available.",
  expired: "This invitation has expired.",
  already_accepted: "This invitation has already been accepted.",
  guardian_required: "This invitation is for a minor and needs a parent or guardian to complete it.",
};

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; declined?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const inv = await getInvitationByToken(token);
  const account = await currentAccount();

  const invalid = !inv;
  const now = new Date().toISOString();
  const expired = inv ? (inv.status === "expired" || invitationExpired(inv.expiresAt.toISOString(), now)) : false;
  const unavailable = inv ? (inv.status === "revoked" || inv.status === "accepted") : false;

  if (sp.declined) {
    return (
      <AuthShell>
        <div className="auth-card auth-result">
          <div className="auth-result__icon">💛</div>
          <h1>Invitation declined</h1>
          <p className="auth-lede">No problem — we've let the host know. You can close this page.</p>
        </div>
      </AuthShell>
    );
  }

  if (invalid || expired || unavailable) {
    return (
      <AuthShell>
        <div className="auth-card auth-result">
          <div className="auth-result__icon">⏳</div>
          <h1>{expired ? "Invitation expired" : unavailable ? "Invitation unavailable" : "Invitation not found"}</h1>
          <p className="auth-lede">
            {expired
              ? "This invitation has expired. Please ask the host to send a new one."
              : unavailable
              ? "This invitation is no longer available. Please ask the host to send a new one."
              : "We couldn't find this invitation. Please check the link or ask the host to resend it."}
          </p>
          <Link href="/" className="auth-link">Return home</Link>
        </div>
      </AuthShell>
    );
  }

  const inviterName = inv!.inviter ? `${inv!.inviter.firstName} ${inv!.inviter.lastName}`.trim() : "A family member";
  const roleLabel = roleDef(inv!.role as Parameters<typeof roleDef>[0]).label;
  const error = sp.error && ACCEPT_ERRORS[sp.error] ? ACCEPT_ERRORS[sp.error] : null;

  return (
    <AuthShell>
      <div className="auth-card">
        <span className="auth-eyebrow">You're invited</span>
        <h1>Join {inviterName}'s family space</h1>
        <p className="auth-lede">
          <b>{inviterName}</b> has invited you to Magical Moments by Reign.
        </p>

        <div className="acct__row"><span className="acct__k">Invited by</span><span className="acct__v">{inviterName}</span></div>
        <div className="acct__row"><span className="acct__k">Your role</span><span className="acct__v">{roleLabel}</span></div>
        <div className="acct__row"><span className="acct__k">Sent to</span><span className="acct__v">{inv!.targetMasked}</span></div>
        <div className="acct__row"><span className="acct__k">Expires</span><span className="acct__v">{inv!.expiresAt.toLocaleDateString()}</span></div>

        <div className="auth-note auth-note--info" style={{ marginTop: "1.1rem" }}>
          You'll only be able to access the Moments the host shares with you — never their private account, billing, or
          other families' information.
        </div>

        {error && <div className="auth-note auth-note--error">{error}</div>}

        {account ? (
          <div style={{ display: "grid", gap: "0.7rem", marginTop: "0.6rem" }}>
            <form action={acceptInviteAction}>
              <input type="hidden" name="token" value={token} />
              <button type="submit" className="auth-btn">Accept invitation</button>
            </form>
            <form action={declineInviteAction}>
              <input type="hidden" name="token" value={token} />
              <button type="submit" className="auth-btn auth-btn--ghost">Decline</button>
            </form>
          </div>
        ) : (
          <div style={{ marginTop: "0.6rem" }}>
            <div className="auth-note auth-note--warn">Please sign in or create your account to accept this invitation.</div>
            <div style={{ display: "grid", gap: "0.7rem" }}>
              <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`} className="auth-btn" style={{ textAlign: "center", textDecoration: "none" }}>Sign in to accept</Link>
              <Link href={`/signup?next=${encodeURIComponent(`/invite/${token}`)}`} className="auth-btn auth-btn--ghost" style={{ textAlign: "center", textDecoration: "none" }}>Create an account</Link>
            </div>
          </div>
        )}
      </div>
    </AuthShell>
  );
}
