import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/guard";
import { getServiceCategory, RESERVATION_STATUS, clientCanCancel } from "@/lib/reservations/catalog";
import { getReservation } from "@/lib/reservations/service";
import OpenConciergeButton from "@/components/concierge/OpenConciergeButton";
import { cancelReservationAction, submitDraftAction } from "../../actions";
import "../../luxury.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reservation", robots: { index: false } };

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="cx-drow">
      <span className="cx-drow__k">{label}</span>
      <span className="cx-drow__v">{value}</span>
    </div>
  );
}

export default async function ReservationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await requireAccount(`/dashboard/luxury-services/reservations/${id}`);
  const r = await getReservation(account.id, id);
  if (!r) notFound();

  const meta = RESERVATION_STATUS[r.status];
  const svc = getServiceCategory(r.serviceType);
  const showConfirmation = meta.showsConfirmation && !!r.confirmationNumber;
  const hasCharge = !!r.depositRequirement;

  return (
    <>
      <div className="pg-head">
        <Link href="/dashboard/luxury-services/reservations" className="cx-back">← My Reservations</Link>
        <span className="pg-eyebrow">{svc?.icon} {svc?.brandedLabel}</span>
        <h1 className="pg-title">{r.title}</h1>
        <div className="cx-status-line">
          <span className={`cx-badge cx-badge--${meta.tone}`}>{meta.label}</span>
          <span className="cx-status-desc">{meta.description}</span>
        </div>
      </div>

      <section className="sec cx-detail">
        <Row label="Service" value={svc?.brandedLabel} />
        <Row label="Provider / business" value={r.business} />
        <Row label="Location" value={r.location} />
        <Row label="Date" value={r.date} />
        <Row label="Time" value={r.time} />
        <Row label="Guests" value={r.guestCount} />
        {showConfirmation && <Row label="Confirmation number" value={r.confirmationNumber} />}
        <Row label="Provider contact" value={r.providerContact} />
        <Row label="Cancellation policy" value={r.cancellationPolicy} />
        <Row label="Your notes" value={r.clientNotes} />
        <Row label="Concierge notes" value={r.conciergeNotes} />
        <Row label="Last update" value={r.updatedAt.toLocaleString()} />
      </section>

      {Object.keys(r.details).length > 0 && (
        <section className="sec">
          <div className="sec__h"><h2 className="sec__t">Request details</h2></div>
          <div className="cx-detail">
            {Object.entries(r.details).map(([k, v]) => (
              <Row key={k} label={k} value={typeof v === "string" ? v : JSON.stringify(v)} />
            ))}
          </div>
        </section>
      )}

      {hasCharge && (
        <section className="sec cx-pay">
          <div className="sec__h"><h2 className="sec__t">Payment &amp; approval</h2></div>
          <p className="cx-pay__intro">This reservation requires a payment. Please review the exact terms before confirming — you will never be charged from a chat or voice request, and every booking goes through Purchase Review first.</p>
          <div className="cx-detail">
            <Row label="Business" value={r.business} />
            <Row label="Amount &amp; fees" value={r.depositRequirement} />
            <Row label="Cancellation / refund" value={r.cancellationPolicy} />
          </div>
          <p className="cx-honest" style={{ marginTop: ".8rem" }}>
            Online payment isn&apos;t connected yet, so payment is arranged securely with the provider through your concierge. Contact your concierge to confirm and pay — no charge happens here.
          </p>
          <OpenConciergeButton className="btn btn--gold" seed={`I'd like to confirm and pay for my reservation: ${r.title}.`}>Confirm Reservation &amp; Payment</OpenConciergeButton>
        </section>
      )}

      <section className="sec cx-actions">
        <div className="sec__h"><h2 className="sec__t">Actions</h2></div>
        <div className="cx-actionbar">
          <OpenConciergeButton className="btn btn--ghost" seed={`About my reservation "${r.title}":`}>Contact Concierge</OpenConciergeButton>

          {r.status === "DRAFT" && (
            <form action={submitDraftAction}><input type="hidden" name="id" value={r.id} /><button type="submit" className="btn btn--gold">Submit Request</button></form>
          )}
          {r.status === "AWAITING_CLIENT_APPROVAL" && (
            <OpenConciergeButton className="btn btn--gold" seed={`I'd like to review the options for "${r.title}".`}>Review Options</OpenConciergeButton>
          )}
          {showConfirmation && (
            <OpenConciergeButton className="btn btn--ghost" seed={`Please show my confirmation for "${r.title}".`}>View Confirmation</OpenConciergeButton>
          )}
          {clientCanCancel(r.status) && (
            <form action={cancelReservationAction}><input type="hidden" name="id" value={r.id} /><button type="submit" className="btn btn--ghost cx-danger">Cancel Request</button></form>
          )}
        </div>
        {r.status === "CONFIRMED" && (
          <p className="note" style={{ marginTop: ".6rem" }}>Cancelling a confirmed reservation is subject to the provider&apos;s cancellation policy above; your concierge will process it.</p>
        )}
      </section>
    </>
  );
}
