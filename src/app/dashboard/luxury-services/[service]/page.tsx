import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/guard";
import { getServiceCategory, intakeFor, pathsFor, RESTAURANT_FILTERS, type IntakeField, type ServicePath } from "@/lib/reservations/catalog";
import OpenConciergeButton from "@/components/concierge/OpenConciergeButton";
import { createRequestAction, saveServiceAction } from "../actions";
import "../luxury.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Luxury Services", robots: { index: false } };

function Field({ f }: { f: IntakeField }) {
  const id = `f_${f.key}`;
  return (
    <label className="cx-field" htmlFor={id}>
      <span className="cx-field__label">{f.label}{f.required ? " *" : ""}</span>
      {f.type === "textarea" ? (
        <textarea id={id} name={f.key} required={f.required} placeholder={f.placeholder} rows={3} />
      ) : f.type === "select" ? (
        <select id={id} name={f.key} defaultValue="">
          <option value="" disabled>Select…</option>
          {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input id={id} name={f.key} type={f.type} required={f.required} placeholder={f.placeholder} />
      )}
    </label>
  );
}

export default async function ServicePage({
  params, searchParams,
}: {
  params: Promise<{ service: string }>;
  searchParams: Promise<{ path?: string }>;
}) {
  const { service } = await params;
  const { path: rawPath } = await searchParams;
  await requireAccount(`/dashboard/luxury-services/${service}`);
  const svc = getServiceCategory(service);
  if (!svc) notFound();

  const offered = pathsFor(svc);
  const path = (rawPath && (offered as string[]).includes(rawPath) ? rawPath : undefined) as ServicePath | undefined;
  const notConnected = svc.connection !== "connected";

  const header = (
    <div className="pg-head">
      <Link href="/dashboard/luxury-services" className="cx-back">← Luxury Services</Link>
      <span className="pg-eyebrow">{svc.icon} {svc.brandedLabel}</span>
    </div>
  );

  // ── Choice screen — the client always chooses first ──
  if (!path) {
    return (
      <>
        {header}
        <h1 className="pg-title">How would you like to begin?</h1>
        <p className="pg-sub">Whether you&apos;d like to explore on your own or have Journey help you find exactly the right thing — it&apos;s entirely your call.</p>
        <div className="ls-choice">
          {offered.includes("search") && (
            <Link href={`/dashboard/luxury-services/${service}?path=search`} className="ls-choice__card">
              <span className="ls-choice__icon">🔍</span>
              <span className="ls-choice__t">Search {svc.label} Myself</span>
              <span className="ls-choice__b">Explore options on your own.</span>
            </Link>
          )}
          <Link href={`/dashboard/luxury-services/${service}?path=help`} className="ls-choice__card">
            <span className="ls-choice__icon">✨</span>
            <span className="ls-choice__t">Help Me Find the Perfect {svc.label}</span>
            <span className="ls-choice__b">Answer a few questions and Journey will guide you.</span>
          </Link>
          <OpenConciergeButton className="ls-choice__card ls-choice__card--btn" seed={`I'd like the Concierge team to help me with ${svc.brandedLabel}.`}>
            <span className="ls-choice__icon">👤</span>
            <span className="ls-choice__t">Ask the Concierge</span>
            <span className="ls-choice__b">Hand it to our team — we&apos;ll take it from here.</span>
          </OpenConciergeButton>
        </div>
      </>
    );
  }

  const fields = intakeFor(service, path);
  const submit = createRequestAction.bind(null, service, path);
  const save = saveServiceAction.bind(null, service);
  const isRestaurantSearch = service === "restaurants" && path === "search";

  return (
    <>
      {header}
      <h1 className="pg-title">{path === "search" ? `Search ${svc.label}` : `Help me find the perfect ${svc.label.toLowerCase()}`}</h1>
      <p className="pg-sub">{path === "search" ? "Tell us the basics to get started." : "A few questions so we can find exactly the right fit."}</p>

      {service === "flights" && path === "search" && (
        <p className="note" style={{ marginBottom: "1rem" }}>Looking for the whole trip? <Link href="/dashboard/luxury-services/vacation-packages?path=help" className="ls-link">Price a Vacation Package →</Link></p>
      )}

      <form action={submit} className="cx-form sec">
        <div className="cx-form__grid">
          {fields.map((f) => <Field key={f.key} f={f} />)}
        </div>

        {isRestaurantSearch && (
          <div className="ls-filters">
            <p className="ls-filters__intro">Refine your search:</p>
            {RESTAURANT_FILTERS.map((g) => (
              <div key={g.id} className="ls-filtergroup">
                <span className="ls-filtergroup__t">{g.label}</span>
                <div className="ls-chips">
                  {g.options.map((o) => (
                    <label key={o} className="ls-chip">
                      <input type="checkbox" name={`filter_${g.id}`} value={o} /> {o}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* HONESTY: no live provider is connected — we never show fake results,
            prices, availability, ratings, or confirmation numbers. */}
        <div className="cx-honest">
          {notConnected ? (
            <>This service isn&apos;t connected to a live provider yet, so we won&apos;t show prices, availability, or ratings we can&apos;t verify. Submit your request and our Concierge Team will gladly source real options — you&apos;ll review and approve everything, and no payment happens without Purchase Review.</>
          ) : (
            <>Prices and availability come from our partners and are subject to change until purchased. You&apos;ll always review everything in Purchase Review before any payment.</>
          )}
        </div>

        <div className="cx-form__actions">
          <button type="submit" className="btn btn--gold">{notConnected ? "Send to Concierge" : "Search"}</button>
          <button type="submit" formAction={save} className="btn btn--ghost">Save for Later</button>
          <button type="submit" name="_action" value="draft" className="btn btn--ghost">Save as draft</button>
        </div>
      </form>
    </>
  );
}
