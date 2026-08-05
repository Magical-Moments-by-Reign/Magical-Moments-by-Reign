import type { Metadata } from "next";
import Link from "next/link";
import { requireOwner } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { EXPERIENCES } from "@/lib/membership-builder";
import { getOwnerDemoState, OWNER_DEMO_EMAIL } from "@/lib/owner-demo";
import {
  reprovisionOwnerDemoAction,
  publishDemoDraftAction,
  unpublishDemoDraftAction,
  resetDemoDraftsAction,
} from "./actions";
import PreviewFrame from "./PreviewFrame";
import "./owner-demo.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Owner Demo Studio", robots: { index: false } };

// ── Truthful feature inventory ──────────────────────────────────
// Only items with an `href` render as a link. Everything else is a plain label —
// no button ever leads nowhere. "Coming Soon" items intentionally have no link.
const BUILT: { name: string; href: string }[] = [
  { name: "Public homepage & brand story", href: "/" },
  { name: "Membership Builder & pricing", href: "/membership" },
  { name: "Get Started tour", href: "/get-started" },
  { name: "Journeys catalog", href: "/experiences" },
  { name: "My Journeys", href: "/journeys" },
  { name: "Sign up · Sign in · Verify · Reset", href: "/login" },
  { name: "Your Magical Space (member home)", href: "/home" },
  { name: "Member dashboard", href: "/dashboard" },
  { name: "Experience pages + design engine", href: "/experiences" },
  { name: "Account · Security · Family · Billing", href: "/account" },
  { name: "Notifications center", href: "/notifications" },
  { name: "Home Estate", href: "/estate/home" },
  { name: "Business edition", href: "/business" },
  { name: "About · FAQs · Success Stories · Contact", href: "/about" },
  { name: "Admin console", href: "/admin" },
  { name: "Vendor portal", href: "/vendors" },
  { name: "Owner Demo Studio", href: "/dashboard/owner-demo" },
];

// Built pages/flows whose full behaviour depends on an external key or provider.
const PARTIAL: { name: string; href?: string; note: string }[] = [
  { name: "Magical AI concierge", href: "/concierge", note: "Answers go live once QWEN_API_KEY is set in Netlify." },
  { name: "Checkout & payments (Square)", href: "/checkout", note: "Needs Square keys. This owner account is billing-exempt for testing." },
  { name: "Transactional email (Resend)", note: "Needs RESEND_API_KEY. This tooling sends no email." },
  { name: "Social Studio & sharing", href: "/dashboard/social", note: "Needs connected social accounts." },
  { name: "Family Vault & media uploads", href: "/dashboard/vault", note: "Needs the media storage backend." },
  { name: "Gifts & registry", href: "/dashboard/purchases", note: "Per-experience gift settings." },
  { name: "Custom domains & websites", href: "/admin/domains", note: "Needs a domain provider." },
  { name: "Housing Hub", href: "/housing-hub", note: "Home Estate expansion." },
  { name: "Share links", href: "/dashboard/shares", note: "RLS-locked until finished." },
];

// Not built yet — no route, so no link (never a dead button).
const COMING_SOON: string[] = [
  "Inline content editor (replace text, photos, videos & dates in-app)",
  "Each Journey as a full Life Estate (beyond the Home Estate)",
  "Milestone-level personalization pages within each Journey",
  "Legacy & Memories page (awaiting your image + placement)",
  "Vendor marketplace booking & transactions",
  "Mobile push notifications",
];

export default async function OwnerDemoStudioPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  await requireOwner("/dashboard/owner-demo");
  await searchParams;

  const state = await getOwnerDemoState(prisma, OWNER_DEMO_EMAIL);
  const draftBySlug = new Map(state.drafts.map((d) => [d.journeyId, d]));

  const builtDrafts = state.drafts.filter((d) => d.exists).length;
  const publishedDrafts = state.drafts.filter((d) => d.status === "PUBLISHED").length;

  return (
    <div className="od">
      <header className="od-top">
        <div>
          <span className="od-eyebrow">Owner · Internal</span>
          <h1 className="od-h1">Owner Demo Studio</h1>
          <p className="od-sub">
            A private workspace to walk through every built Journey and feature, publish or
            hide sample drafts, and preview exactly what a visitor sees.
          </p>
        </div>
        <div className="od-topnav">
          <Link href="/dashboard">← Dashboard</Link>
          <Link href="/home">Your Space</Link>
        </div>
      </header>

      {/* Provisioning status */}
      <section className={`od-status ${state.provisioned ? "is-ok" : "is-pending"}`}>
        {state.provisioned ? (
          <>
            <div className="od-status__row">
              <span className="od-status__dot" aria-hidden="true" />
              <b>Owner demo account is provisioned.</b>
            </div>
            <ul className="od-status__facts">
              <li><span>Account</span>{OWNER_DEMO_EMAIL}</li>
              <li><span>Membership</span>{state.membershipTier} · Full Lifetime</li>
              <li><span>Internal demo</span>{state.isDemo ? "Yes" : "No"}</li>
              <li><span>Billing bypass</span>{state.billingExempt ? "Yes (this account only)" : "No"}</li>
              <li><span>Demo drafts</span>{builtDrafts}/{state.drafts.length} created · {publishedDrafts} published</li>
            </ul>
          </>
        ) : (
          <>
            <div className="od-status__row">
              <span className="od-status__dot" aria-hidden="true" />
              <b>Not provisioned in this database yet.</b>
            </div>
            <p className="od-note">
              Run the provisioning script once against production to create and grant the
              <code> {OWNER_DEMO_EMAIL} </code> account, then reload this page:
            </p>
            <pre className="od-code">DATABASE_URL=&quot;…pooler.supabase.com:5432/postgres&quot; npx tsx scripts/provision-owner-demo.ts</pre>
            <p className="od-note">Full instructions live in <code>docs/OWNER_DEMO.md</code>.</p>
          </>
        )}
      </section>

      {/* Journeys & their demo drafts */}
      <section className="od-sec">
        <h2 className="od-h2">Journeys &amp; demo drafts</h2>
        <p className="od-secsub">
          Every built Journey, its sub-occasions, and its <span className="od-badge od-badge--demo">DEMO</span> sample draft.
          Publish makes a draft visible at its public URL; Unpublish returns it to private.
        </p>

        <div className="od-cards">
          {EXPERIENCES.map((j) => {
            const d = draftBySlug.get(j.id);
            const exists = Boolean(d?.exists);
            const status = d?.status ?? null;
            return (
              <article key={j.id} className="od-card">
                <div className="od-card__head">
                  <span className="od-card__icon" aria-hidden="true">{j.icon}</span>
                  <h3 className="od-card__title">{j.label}</h3>
                  <span className="od-badge od-badge--demo">DEMO</span>
                </div>

                <div className="od-card__status">
                  {!exists && <span className="od-badge od-badge--none">Not created</span>}
                  {status === "DRAFT" && <span className="od-badge od-badge--draft">Draft · private</span>}
                  {status === "PUBLISHED" && <span className="od-badge od-badge--pub">Published · public</span>}
                </div>

                {j.milestones.length > 0 ? (
                  <div className="od-chips">
                    {j.milestones.map((m) => (
                      <span key={m.id} className="od-chip">{m.label}</span>
                    ))}
                  </div>
                ) : (
                  <p className="od-note">Open-ended — no fixed sub-occasions.</p>
                )}

                <div className="od-card__acts">
                  {exists ? (
                    <>
                      <a className="od-btn od-btn--ghost" href={`/${d!.slug}`} target="_blank" rel="noreferrer">Preview ↗</a>
                      <a className="od-btn od-btn--ghost" href={`/${d!.slug}`} target="_blank" rel="noreferrer">Open &amp; edit</a>
                      {status === "PUBLISHED" ? (
                        <form action={unpublishDemoDraftAction}>
                          <input type="hidden" name="slug" value={d!.slug} />
                          <button type="submit" className="od-btn od-btn--warn">Unpublish</button>
                        </form>
                      ) : (
                        <form action={publishDemoDraftAction}>
                          <input type="hidden" name="slug" value={d!.slug} />
                          <button type="submit" className="od-btn od-btn--gold">Publish</button>
                        </form>
                      )}
                    </>
                  ) : (
                    <span className="od-note">Run provisioning to create this draft.</span>
                  )}
                </div>
                <p className="od-card__foot">Inline text/photo editor — <i>Coming Soon</i>. Placeholder content is ready to preview now.</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Real visitor-view preview (desktop + mobile) */}
      <section className="od-sec">
        <h2 className="od-h2">Visitor-view preview</h2>
        <p className="od-secsub">See any demo draft exactly as a visitor would, at desktop or phone width.</p>
        <PreviewFrame options={state.drafts.map((d) => ({ slug: d.slug, title: d.title, exists: d.exists }))} />
      </section>

      {/* Truthful inventory */}
      <section className="od-sec">
        <h2 className="od-h2">Feature inventory</h2>
        <div className="od-inv">
          <div className="od-invcol">
            <h3 className="od-invcol__t od-invcol__t--ok">Built &amp; working</h3>
            <ul>
              {BUILT.map((f) => (
                <li key={f.name}><Link href={f.href}>{f.name}</Link></li>
              ))}
            </ul>
          </div>
          <div className="od-invcol">
            <h3 className="od-invcol__t od-invcol__t--partial">Built · not fully connected</h3>
            <ul>
              {PARTIAL.map((f) => (
                <li key={f.name}>
                  {f.href ? <Link href={f.href}>{f.name}</Link> : <span>{f.name}</span>}
                  <em className="od-invnote">{f.note}</em>
                </li>
              ))}
            </ul>
          </div>
          <div className="od-invcol">
            <h3 className="od-invcol__t od-invcol__t--soon">Coming Soon</h3>
            <ul>
              {COMING_SOON.map((f) => (
                <li key={f}><span>{f}</span><span className="od-badge od-badge--none">Coming Soon</span></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Owner maintenance */}
      <section className="od-sec od-maint">
        <h2 className="od-h2">Maintenance</h2>
        <div className="od-maint__row">
          <form action={reprovisionOwnerDemoAction}>
            <button type="submit" className="od-btn od-btn--gold">Re-sync roles &amp; missing drafts</button>
            <span className="od-note">Idempotent — creates only what&rsquo;s missing, never overwrites your edits.</span>
          </form>
          <form action={resetDemoDraftsAction}>
            <button type="submit" className="od-btn od-btn--warn">Remove all demo drafts</button>
            <span className="od-note">Deletes only the demo drafts (never a customer Journey). The owner account stays.</span>
          </form>
        </div>
      </section>
    </div>
  );
}
