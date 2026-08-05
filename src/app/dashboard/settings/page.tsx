import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { MEMBERSHIP_LABEL } from "@/lib/membership-access";
import { logoutAction } from "../../account/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Account & Settings", robots: { index: false } };

export default async function SettingsPage() {
  const account = await requireAccount("/dashboard/settings");
  const detail = await prisma.account.findUnique({
    where: { id: account.id },
    select: {
      emails: { where: { isPrimary: true }, select: { email: true, verified: true }, take: 1 },
      phones: { where: { isPrimary: true }, select: { phone: true }, take: 1 },
    },
  }).catch(() => null);

  const email = detail?.emails[0]?.email ?? "—";
  const phone = detail?.phones[0]?.phone ?? "Not added";
  const tier = MEMBERSHIP_LABEL[account.membershipTier] ?? account.membershipTier;

  const MANAGE = [
    { t: "Profile", s: "Name, profile photo, personal details", href: "/account" },
    { t: "Password & security", s: "Password, active sessions, sign-in", href: "/account" },
    { t: "Notifications", s: "Email and in-app notification preferences", href: "/notifications" },
    { t: "Privacy", s: "Who can see your Journeys and memories", href: "/account" },
    { t: "Family members", s: "People who share your Journeys", href: "/account/family" },
    { t: "Membership & billing", s: "Your plan, receipts, and payment", href: "/dashboard/purchases" },
    { t: "Connected accounts", s: "Google, Apple, and social sign-in", href: "/account" },
  ];

  return (
    <>
      <div className="pg-head">
        <span className="pg-eyebrow">Your account</span>
        <h1 className="pg-title">Account &amp; Settings</h1>
        <p className="pg-sub">Manage your profile, security, privacy, and membership.</p>
      </div>

      <div className="card" style={{ marginBottom: "1.4rem" }}>
        <h3>Your details</h3>
        <div className="list">
          <div className="row"><div className="row__main"><div className="row__s">Name</div><div className="row__t">{account.firstName} {account.lastName}</div></div></div>
          <div className="row"><div className="row__main"><div className="row__s">Email</div><div className="row__t">{email} {detail?.emails[0]?.verified === false && <span className="badge badge--soon">Unverified</span>}</div></div></div>
          <div className="row"><div className="row__main"><div className="row__s">Phone</div><div className="row__t">{phone}</div></div></div>
          <div className="row"><div className="row__main"><div className="row__s">Membership</div><div className="row__t">{tier}</div></div><Link href="/membership" className="btn btn--sm btn--ghost">Manage</Link></div>
        </div>
      </div>

      <section className="sec">
        <div className="sec__h"><h2 className="sec__t">Manage</h2></div>
        <div className="grid grid--cards">
          {MANAGE.map((m) => (
            <Link key={m.t} href={m.href} className="card" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
              <div className="row__t">{m.t}</div>
              <div className="row__s">{m.s}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="sec">
        <div className="sec__h"><h2 className="sec__t">Danger zone</h2></div>
        <div className="list">
          <div className="soon-row"><span>Delete account</span><span className="badge badge--soon">Coming Soon</span></div>
          <form action={logoutAction}><button type="submit" className="btn btn--warn">Sign out</button></form>
        </div>
      </section>
    </>
  );
}
