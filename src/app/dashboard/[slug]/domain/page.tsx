import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteNav from "@/components/site/SiteNav";
import { prisma } from "@/lib/db";
import { getExperienceBySlug } from "@/lib/experiences";
import { resolvePlanForExperience } from "@/lib/media";
import {
  fallbackAddressFor, activeAddressFor, isFallbackActive, domainEligible,
  STATUS_LABEL, DOMAIN_LANGUAGE, DOMAIN_LANGUAGE_LIFETIME,
} from "@/lib/domains";
import { getPlan, formatPrice } from "@/lib/plans";
import { retryRenewalAction, toggleAutoRenewAction } from "./actions";
import "../media/media.css";
import "./domain.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Domain management" };

function fmt(d?: Date | null) {
  return d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";
}

export default async function DomainPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const exp = await getExperienceBySlug(slug);
  if (!exp) notFound();

  const planId = await resolvePlanForExperience(exp.id);
  const plan = getPlan(planId);
  const eligible = domainEligible(planId);
  const domain = await prisma.domain.findFirst({
    where: { experienceId: exp.id },
    orderBy: { createdAt: "desc" },
  });
  const fallback = domain?.fallbackAddress ?? fallbackAddressFor(slug);
  const fallbackActive = domain ? isFallbackActive(domain.status, domain.usingFallback) : false;

  return (
    <div className="mp dm">
      <SiteNav />
      <header className="mp-header">
        <div className="container">
          <Link href="/dashboard" className="mp-back">← Back to your studio</Link>
          <span className="eyebrow" style={{ color: "var(--gold-soft)" }}>Domain management</span>
          <h1>Your address &amp; Legacy Protection</h1>
          <p>Every experience always keeps a permanent Magical Moments by Reign address. A custom domain is an optional premium address layered on top.</p>
        </div>
      </header>

      <main className="container mp-main">
        {/* Permanent platform address — always present */}
        <section className="dm-card dm-card--permanent">
          <div className="dm-card__head">
            <h2>Permanent Magical Moments address</h2>
            <span className="dm-chip dm-chip--live">● Always active</span>
          </div>
          <code className="dm-address">{fallback}</code>
          <p className="dm-note">This address is protected by <b>Legacy Protection</b> and is never removed because of a domain payment or expiration — your memories always live here.</p>
        </section>

        {/* Legacy Protection banner when fallback is serving the experience */}
        {fallbackActive && (
          <div className="dm-banner">
            <span aria-hidden="true">🛡</span>
            <p>Your custom domain is currently inactive. Your memories remain safely available through your Magical Moments address above.</p>
          </div>
        )}

        {/* Custom domain */}
        {domain ? (
          <section className="dm-card">
            <div className="dm-card__head">
              <h2>Custom domain</h2>
              <span className={`dm-chip dm-chip--${domain.status.toLowerCase()}`}>{STATUS_LABEL[domain.status] ?? domain.status}</span>
            </div>
            <code className="dm-address">{domain.name}</code>
            <p className="dm-serving">Currently serving at: <b>{activeAddressFor(domain)}</b></p>

            <dl className="dm-grid">
              <div><dt>Registration</dt><dd>{fmt(domain.registrationDate)}</dd></div>
              <div><dt>Expiration</dt><dd>{fmt(domain.expirationDate)}</dd></div>
              <div><dt>Renewal amount</dt><dd>{domain.renewalPrice != null ? formatPrice(domain.renewalPrice / 100) : "—"}</dd></div>
              <div><dt>Auto-renew</dt><dd>{domain.autoRenew ? "On" : "Off"}</dd></div>
              <div><dt>Payment method</dt><dd>{domain.cardLast4 ? `Card ending ${domain.cardLast4}` : "Not saved"}</dd></div>
              <div><dt>Registrar</dt><dd>{domain.registrar ?? "—"}</dd></div>
              <div><dt>DNS</dt><dd>{domain.dnsStatus}</dd></div>
              <div><dt>SSL</dt><dd>{domain.sslStatus}</dd></div>
            </dl>

            <div className="dm-actions">
              {(domain.status === "PAYMENT_FAILED" || domain.status === "GRACE_PERIOD" || domain.status === "EXPIRED" || domain.status === "USING_FALLBACK") && (
                <form action={retryRenewalAction}>
                  <input type="hidden" name="id" value={domain.id} />
                  <input type="hidden" name="slug" value={slug} />
                  <button type="submit" className="btn-gold">Retry payment &amp; restore</button>
                </form>
              )}
              <Link href="/dashboard/billing" className="btn btn-dark">Update payment method</Link>
              <form action={toggleAutoRenewAction}>
                <input type="hidden" name="id" value={domain.id} />
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="autoRenew" value={String(!domain.autoRenew)} />
                <button type="submit" className="dm-link">{domain.autoRenew ? "Turn off auto-renew" : "Turn on auto-renew"}</button>
              </form>
              <a href={`https://${fallback}`} className="dm-link" target="_blank" rel="noreferrer">View fallback address</a>
            </div>
          </section>
        ) : eligible ? (
          <section className="dm-card dm-card--add">
            <h2>Add a custom domain</h2>
            <p>Your <b>{plan?.name}</b> plan includes one custom domain. Search for the perfect address — you pay the registrar&apos;s registration and annual renewal, and we connect it automatically.</p>
            <Link href="/contact?reason=domain" className="btn-gold">Choose a custom domain</Link>
          </section>
        ) : (
          <section className="dm-card dm-card--add">
            <h2>Want your own custom domain?</h2>
            <p>Custom domains are included with the <b>Diamond</b> and <b>Lifetime</b> plans. Your experience always keeps its Magical Moments address on every plan.</p>
            <Link href="/pricing" className="btn-gold">See Diamond &amp; Lifetime</Link>
          </section>
        )}

        <p className="dm-legal">{planId === "lifetime" ? DOMAIN_LANGUAGE_LIFETIME : DOMAIN_LANGUAGE}</p>
      </main>
    </div>
  );
}
