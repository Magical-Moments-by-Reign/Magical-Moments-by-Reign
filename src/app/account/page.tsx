import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { roleDef } from "@/lib/roles";
import { maskEmail, maskPhone } from "@/lib/account-identity";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default async function AccountHome({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const acct = await requireAccount();
  const sp = await searchParams;
  const data = await prisma.account.findUnique({
    where: { id: acct.id },
    select: {
      customerId: true, createdAt: true, googleSub: true, appleSub: true,
      emails: { where: { isPrimary: true }, select: { email: true, verified: true }, take: 1 },
      phones: { where: { isPrimary: true }, select: { phone: true, verified: true }, take: 1 },
    },
  });
  const email = data?.emails[0];
  const phone = data?.phones[0];
  // Distinguish "no phone on file" from "phone present but unverified". An empty
  // or whitespace-only value must NOT be shown as an unverified phone.
  const hasPhone = !!phone?.phone?.trim();
  const connected = [data?.googleSub && "Google", data?.appleSub && "Apple"].filter(Boolean) as string[];

  return (
    <>
      <h1>Welcome, {acct.firstName}</h1>
      <p>Your permanent Magical Moments account — one account for your whole family, for life.</p>

      {sp.denied && (
        <div className="auth-note auth-note--warn" style={{ marginTop: "1rem" }}>
          You don't have permission to view that section.
        </div>
      )}

      <h2>Profile</h2>
      <div className="acct__row"><span className="acct__k">Name</span><span className="acct__v">{acct.firstName} {acct.lastName}</span></div>
      <div className="acct__row"><span className="acct__k">Customer ID</span><span className="acct__v">{data?.customerId}</span></div>
      <div className="acct__row"><span className="acct__k">Role</span><span className="acct__v">{roleDef(acct.role).label}</span></div>
      <div className="acct__row">
        <span className="acct__k">Account status</span>
        <span className="acct__v"><span className={`chip ${acct.status === "ACTIVE" ? "chip--ok" : "chip--warn"}`}>{acct.status.replace(/_/g, " ").toLowerCase()}</span></span>
      </div>
      <div className="acct__row">
        <span className="acct__k">Email</span>
        <span className="acct__v">
          {email ? maskEmail(email.email) : "—"}{" "}
          <span className={`chip ${email?.verified ? "chip--ok" : "chip--warn"}`}>{email?.verified ? "verified" : "unverified"}</span>
        </span>
      </div>
      <div className="acct__row">
        <span className="acct__k">Phone</span>
        <span className="acct__v">
          {!hasPhone ? (
            // No number on file — plain text, never an "unverified" badge.
            <span style={{ color: "#7a7385" }}>No phone number added</span>
          ) : (
            <>
              {maskPhone(phone!.phone)}{" "}
              <span className={`chip ${phone!.verified ? "chip--ok" : "chip--warn"}`}>{phone!.verified ? "verified" : "unverified"}</span>
              {/* SMS verification isn't connected yet — say so honestly rather than offer a fake action. */}
              {!phone!.verified && <span className="chip chip--muted" style={{ marginLeft: "0.4rem" }}>verification coming soon</span>}
            </>
          )}
        </span>
      </div>
      <div className="acct__row"><span className="acct__k">Member since</span><span className="acct__v">{data?.createdAt.toLocaleDateString()}</span></div>
      <div className="acct__row">
        <span className="acct__k">Connected accounts</span>
        <span className="acct__v">{connected.length ? connected.join(", ") : <span className="chip chip--muted">none</span>}</span>
      </div>

      <h2>Quick links</h2>
      <div className="acct__row"><span className="acct__v"><Link href="/account/family" className="auth-link">Family & invitations →</Link></span></div>
      <div className="acct__row"><span className="acct__v"><Link href="/account/notifications" className="auth-link">Notification preferences →</Link></span></div>
      <div className="acct__row"><span className="acct__v"><Link href="/account/security" className="auth-link">Security & active sessions →</Link></span></div>
    </>
  );
}
