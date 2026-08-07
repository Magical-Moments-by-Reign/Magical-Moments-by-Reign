import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/guard";
import { getServiceCategory, intakeFor, type IntakeField } from "@/lib/reservations/catalog";
import { createRequestAction } from "../../actions";
import "../../concierge-hub.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New request", robots: { index: false } };

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
      {f.help && <span className="cx-field__help">{f.help}</span>}
    </label>
  );
}

export default async function RequestPage({ params }: { params: Promise<{ service: string }> }) {
  const { service } = await params;
  await requireAccount(`/dashboard/concierge/request/${service}`);
  const svc = getServiceCategory(service);
  if (!svc) notFound();

  const fields = intakeFor(service);
  const isRestaurant = service === "restaurants";
  const submit = createRequestAction.bind(null, service);

  return (
    <>
      <div className="pg-head">
        <Link href="/dashboard/concierge" className="cx-back">← Concierge &amp; Reservations</Link>
        <span className="pg-eyebrow">{svc.icon} {svc.label}</span>
        <h1 className="pg-title">Tell us what you&apos;re looking for</h1>
        <p className="pg-sub">{isRestaurant ? "Share a few details and our concierge will source real options for you." : "Share the details and our concierge will take it from here."}</p>
      </div>

      <form action={submit} className="cx-form sec">
        <div className="cx-form__grid">
          {fields.map((f) => <Field key={f.key} f={f} />)}
        </div>

        {/* Honesty: no live provider is connected, so we never pretend to show
            availability. The request goes to the concierge. */}
        <div className="cx-honest">
          Live availability isn&apos;t connected for this service yet, so we won&apos;t show times or prices we can&apos;t verify. Submit your request and our concierge will source real options — you&apos;ll approve anything before it&apos;s ever booked or paid.
        </div>

        {isRestaurant ? (
          <div className="cx-form__actions">
            <button type="submit" className="btn btn--gold">Let Concierge Handle It</button>
            <button type="button" className="btn btn--ghost" disabled title="Live restaurant browsing isn't connected yet">Browse Available Restaurants (not yet connected)</button>
            <button type="submit" name="_action" value="draft" className="btn btn--ghost">Save as draft</button>
          </div>
        ) : (
          <div className="cx-form__actions">
            <button type="submit" className="btn btn--gold">Submit Concierge Request</button>
            <button type="submit" name="_action" value="draft" className="btn btn--ghost">Save as draft</button>
          </div>
        )}
      </form>
    </>
  );
}
