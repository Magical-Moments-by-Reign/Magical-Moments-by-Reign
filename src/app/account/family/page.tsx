import type { Metadata } from "next";
import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { roleDef, isFamilyManager, isStaffRole, type PlatformRole } from "@/lib/roles";
import { sendInviteAction } from "./actions";

export const metadata: Metadata = { title: "Family & invitations", robots: { index: false } };

const INVITE_ROLES: PlatformRole[] = ["parent", "guardian", "spouse", "partner", "teen", "child", "invited_member", "guest"];

function statusChip(status: string) {
  const cls = status === "accepted" || status === "approved" ? "chip--ok" : status === "pending" ? "chip--warn" : "chip--muted";
  return <span className={`chip ${cls}`}>{status}</span>;
}

export default async function FamilyPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const acct = await requireAccount();
  const sp = await searchParams;
  const canManage = isFamilyManager(acct.role) || isStaffRole(acct.role);

  const [children, invitations] = await Promise.all([
    prisma.account.findMany({
      where: { guardianAccountId: acct.id },
      select: {
        id: true, firstName: true, lastName: true, platformRole: true,
        guardianApprovals: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, permissions: true } },
      },
    }),
    prisma.invitation.findMany({
      where: { inviterAccountId: acct.id },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: { id: true, role: true, status: true, targetMasked: true, expiresAt: true, kind: true },
    }),
  ]);

  return (
    <>
      <h1>Family</h1>
      <p>One membership, your whole family. Invite loved ones, manage young family members, and control what everyone can see.</p>

      {sp.invite === "sent" && <div className="auth-note auth-note--ok" style={{ marginTop: "1rem" }}>Invitation sent. They'll receive a secure link by email.</div>}
      {sp.invite === "forbidden" && <div className="auth-note auth-note--error" style={{ marginTop: "1rem" }}>Only a family owner, parent, or guardian can send invitations.</div>}
      {sp.invite === "invalid" && <div className="auth-note auth-note--error" style={{ marginTop: "1rem" }}>Please choose a role and enter a valid email.</div>}

      {/* ── Children & Teens ── */}
      <h2 id="children">Children & Teens</h2>
      {children.length === 0 ? (
        <p style={{ color: "#a1917a" }}>No young family members yet. When a teen or child signs up with your email as their guardian, they'll appear here for your approval.</p>
      ) : (
        children.map((c) => {
          const approval = c.guardianApprovals[0]?.status ?? "pending";
          return (
            <div className="acct__row" key={c.id}>
              <span className="acct__v">{c.firstName} {c.lastName} <span className="chip chip--muted">{roleDef(c.platformRole as PlatformRole).label}</span></span>
              <span className="acct__v">{statusChip(approval)}</span>
            </div>
          );
        })
      )}

      {/* ── Permissions ── */}
      <h2 id="permissions">Permissions</h2>
      <p style={{ color: "#a1917a" }}>
        You control exactly what each young family member can see and do — set during approval and adjustable anytime.
        We never track location or monitor private activity.
      </p>

      {/* ── Invitations ── */}
      <h2 id="invitations">Invitations</h2>
      {canManage ? (
        <form action={sendInviteAction} style={{ margin: "0.4rem 0 1.2rem" }}>
          <div className="auth-row">
            <label className="auth-field"><span>Role</span>
              <select name="role" defaultValue="invited_member">
                {INVITE_ROLES.map((r) => <option key={r} value={r}>{roleDef(r).label}</option>)}
              </select>
            </label>
            <label className="auth-field"><span>Their email</span><input name="email" type="email" required placeholder="loved-one@email.com" /></label>
          </div>
          <button type="submit" className="auth-btn" style={{ maxWidth: 260 }}>Send invitation</button>
          <p style={{ fontSize: "0.8rem", color: "#a1917a", marginTop: "0.5rem" }}>
            Inviting a teen or child sends a guardian-approval request as part of joining.
          </p>
        </form>
      ) : (
        <p style={{ color: "#a1917a" }}>Only a family owner, parent, or guardian can send invitations.</p>
      )}

      {invitations.length === 0 ? (
        <p style={{ color: "#a1917a" }}>No invitations sent yet.</p>
      ) : (
        invitations.map((inv) => (
          <div className="acct__row" key={inv.id}>
            <span className="acct__v">{inv.targetMasked} <span className="chip chip--muted">{roleDef(inv.role as PlatformRole).label}</span></span>
            <span className="acct__v">{statusChip(inv.status)} <span style={{ fontSize: "0.78rem", color: "#a1917a", marginLeft: 6 }}>exp {inv.expiresAt.toLocaleDateString()}</span></span>
          </div>
        ))
      )}
    </>
  );
}
