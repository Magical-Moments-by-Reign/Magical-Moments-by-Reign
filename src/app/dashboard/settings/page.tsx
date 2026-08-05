import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { membershipDisplay } from "@/lib/membership-access";
import { logoutAction } from "../../account/actions";
import AssistantSettings from "./AssistantSettings";
import VoiceSettings from "./VoiceSettings";
import "./settings.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Account & Settings", robots: { index: false } };

export default async function SettingsPage({
  searchParams,
}: { searchParams: Promise<{ assistant?: string }> }) {
  const account = await requireAccount("/dashboard/settings");
  const sp = await searchParams;
  const detail = await prisma.account.findUnique({
    where: { id: account.id },
    select: {
      staffRoles: true,
      voicePrefs: true,
      emails: { where: { isPrimary: true }, select: { email: true, verified: true }, take: 1 },
      phones: { where: { isPrimary: true }, select: { phone: true }, take: 1 },
    },
  }).catch(() => null);

  const email = detail?.emails[0]?.email ?? "—";
  const phone = detail?.phones[0]?.phone ?? "Not added";
  let owner = false;
  try { owner = (JSON.parse(detail?.staffRoles || "[]") as unknown[]).includes("owner"); } catch { owner = false; }
  const tier = membershipDisplay(account.membershipTier, { owner });

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

      <AssistantSettings currentName={account.assistantName} firstName={account.firstName} flag={sp.assistant} />

      <VoiceSettings assistantName={account.assistantName} firstName={account.firstName} profileVoicePrefs={detail?.voicePrefs || "{}"} />

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
