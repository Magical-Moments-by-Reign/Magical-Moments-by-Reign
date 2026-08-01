"use client";

// ── Checkout ────────────────────────────────────────────────────
// Multi-step, cart-driven checkout. Totals shown here are for display;
// the server recomputes the authoritative total when the order is
// created. Card data is entered ONLY in Square's hosted card field —
// never in our own inputs. When Square isn't configured yet, the order
// is recorded as PENDING and the confirmation explains next steps.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { getPlan, formatPrice } from "@/lib/plans";
import { needsShipping, requiredAcks } from "@/lib/commerce";
import { EXPERIENCE_TYPES } from "@/lib/experience-types";

const STEPS = ["Details", "Billing", "Review", "Payment"];
const squareReady = Boolean(process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID && process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID);

type Addr = { line1: string; line2: string; city: string; region: string; postal: string; country: string };
const emptyAddr: Addr = { line1: "", line2: "", city: "", region: "", postal: "", country: "US" };

export default function CheckoutClient() {
  const { cart, totals, clear } = useCart();
  const plan = cart.planId ? getPlan(cart.planId) : undefined;
  const shipping = needsShipping(cart);
  const acks = requiredAcks(cart);
  const hasCustomDomain = plan?.id === "diamond" || plan?.id === "lifetime";

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Details
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [expTitle, setExpTitle] = useState("");
  const [expType, setExpType] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [customDomain, setCustomDomain] = useState("");

  // Addresses
  const [billing, setBilling] = useState<Addr>(emptyAddr);
  const [ship, setShip] = useState<Addr>(emptyAddr);

  // Consents
  const [ackChecked, setAckChecked] = useState<boolean[]>(acks.map(() => false));
  const [tos, setTos] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [renewalAck, setRenewalAck] = useState(false);

  const [order, setOrder] = useState<{ id: string; number: string } | null>(null);
  const cardRef = useRef<{ tokenize: () => Promise<{ status: string; token?: string }> } | null>(null);

  if (!plan) {
    return (
      <div className="co-emptycart">
        <h2>Your cart needs a plan</h2>
        <p>Choose a preservation plan to begin checkout.</p>
        <Link href="/pricing" className="btn-gold">View plans</Link>
      </div>
    );
  }

  const canDetails = name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canReview = tos && privacy && renewalAck && ackChecked.every(Boolean);

  async function createPendingOrder(): Promise<{ id: string; number: string } | null> {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cart,
          details: {
            name, email, phone,
            experienceTitle: expTitle, experienceType: expType, eventDate,
            customDomain: hasCustomDomain ? customDomain : undefined,
            billing: billing.line1 ? billing : undefined,
            shipping: shipping && ship.line1 ? ship : undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create your order.");
      setOrder(data);
      return data;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function goToPayment() {
    const o = order ?? (await createPendingOrder());
    if (o) setStep(3);
  }

  function finishPending(number: string) {
    clear();
    window.location.href = `/checkout/confirmation?order=${number}`;
  }

  async function payWithSquare() {
    if (!order) return;
    setBusy(true); setError("");
    try {
      const tok = await cardRef.current?.tokenize();
      if (!tok || tok.status !== "OK" || !tok.token) throw new Error("Please check your card details.");
      const res = await fetch("/api/square/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, sourceId: tok.token, idempotencyKey: `${order.id}-${Date.now()}` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment failed.");
      finishPending(order.number);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="co2">
      <ol className="co2-steps">
        {STEPS.map((s, i) => (
          <li key={s} className={`co2-step${step === i ? " is-on" : ""}${step > i ? " is-done" : ""}`}>
            <span className="co2-step__n">{step > i ? "✓" : i + 1}</span>{s}
          </li>
        ))}
      </ol>

      <div className="co2-grid">
        <div className="co2-main">
          {error && <div className="co2-error">{error}</div>}

          {step === 0 && (
            <section className="co2-card">
              <h2 className="co2-h2">Your details</h2>
              <div className="co2-row">
                <label className="co2-field"><span>Full name *</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
                <label className="co2-field"><span>Email *</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
              </div>
              <div className="co2-row">
                <label className="co2-field"><span>Phone</span><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
                <label className="co2-field"><span>Experience type</span>
                  <select value={expType} onChange={(e) => setExpType(e.target.value)}>
                    <option value="">— Select —</option>
                    {EXPERIENCE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </label>
              </div>
              <div className="co2-row">
                <label className="co2-field"><span>Experience title</span><input value={expTitle} onChange={(e) => setExpTitle(e.target.value)} placeholder="e.g. The Smith Wedding" /></label>
                <label className="co2-field"><span>Event date (optional)</span><input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} /></label>
              </div>
              {hasCustomDomain && (
                <label className="co2-field"><span>Preferred custom domain (optional)</span><input value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} placeholder="thesmithwedding.com" />
                  <small>Availability is not guaranteed — we&apos;ll confirm or help you choose another.</small>
                </label>
              )}
              <div className="co2-actions"><button className="btn-gold" disabled={!canDetails} onClick={() => setStep(1)}>Continue →</button></div>
            </section>
          )}

          {step === 1 && (
            <section className="co2-card">
              <h2 className="co2-h2">Billing address</h2>
              <AddressFields addr={billing} onChange={setBilling} />
              {shipping && (
                <>
                  <h2 className="co2-h2" style={{ marginTop: "1.6rem" }}>Shipping address</h2>
                  <p className="co2-note">Your order includes a physical item, so we need a shipping address.</p>
                  <AddressFields addr={ship} onChange={setShip} />
                </>
              )}
              <div className="co2-actions">
                <button className="co2-back" onClick={() => setStep(0)}>← Back</button>
                <button className="btn-gold" onClick={() => setStep(2)}>Continue →</button>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="co2-card">
              <h2 className="co2-h2">Review &amp; confirm</h2>
              <ul className="co2-review">
                <li><span>Plan</span><strong>{plan.name} · {plan.termShort}</strong></li>
                {totals.lines.filter((l) => l.kind === "addon").map((l) => (
                  <li key={l.id}><span>{l.label} × {l.qty}</span><strong>{formatPrice(l.amount)}</strong></li>
                ))}
                <li><span>Included address</span><strong>{plan.domain}</strong></li>
                {customDomain && <li><span>Requested domain</span><strong>{customDomain}</strong></li>}
              </ul>

              <div className="co2-consents">
                {acks.map((a, i) => (
                  <label key={i} className="co2-check"><input type="checkbox" checked={ackChecked[i]} onChange={(e) => setAckChecked((s) => s.map((v, j) => (j === i ? e.target.checked : v)))} /><span>{a}</span></label>
                ))}
                <label className="co2-check"><input type="checkbox" checked={renewalAck} onChange={(e) => setRenewalAck(e.target.checked)} /><span>I understand my plan is a one-time payment for its term and does not auto-renew; custom domains renew annually and are subject to availability.</span></label>
                <label className="co2-check"><input type="checkbox" checked={tos} onChange={(e) => setTos(e.target.checked)} /><span>I agree to the Terms of Service.</span></label>
                <label className="co2-check"><input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} /><span>I agree to the Privacy Policy.</span></label>
              </div>

              <div className="co2-actions">
                <button className="co2-back" onClick={() => setStep(1)}>← Back</button>
                <button className="btn-gold" disabled={!canReview || busy} onClick={goToPayment}>{busy ? "Preparing…" : "Continue to payment →"}</button>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="co2-card">
              <h2 className="co2-h2">Payment</h2>
              {squareReady ? (
                <SquareCard total={totals.total} busy={busy} onReady={(api) => { cardRef.current = api; }} onPay={payWithSquare} />
              ) : (
                <div className="co2-pending">
                  <p><strong>Secure card payment (Square) isn&apos;t configured yet.</strong></p>
                  <p className="co2-note">Your order will be recorded as <em>pending payment</em>. Once Square credentials are added, the card field appears here and the order is charged securely.</p>
                  <button className="btn-gold" disabled={busy} onClick={() => order && finishPending(order.number)}>
                    Place order (payment pending)
                  </button>
                </div>
              )}
              <div className="co2-actions"><button className="co2-back" onClick={() => setStep(2)}>← Back</button></div>
            </section>
          )}
        </div>

        {/* Order summary */}
        <aside className="co2-summary">
          <h3>Order summary</h3>
          <ul className="co2-sumlines">
            {totals.lines.map((l) => (
              <li key={`${l.kind}-${l.id}`}><span>{l.label}{l.qty > 1 ? ` × ${l.qty}` : ""}</span><span>{formatPrice(l.amount)}</span></li>
            ))}
          </ul>
          <div className="co2-sumrow"><span>Subtotal</span><span>{formatPrice(totals.subtotal)}</span></div>
          {totals.tax > 0 && <div className="co2-sumrow"><span>Tax</span><span>{formatPrice(totals.tax)}</span></div>}
          <div className="co2-sumrow co2-sumrow--total"><span>Total due today</span><span>{formatPrice(totals.total)}</span></div>
          {totals.recurringAnnual > 0 && <p className="co2-recur">Then {formatPrice(totals.recurringAnnual)}/yr for custom domain renewal.</p>}
          <p className="co2-fine">USD · taxes may apply · one-time unless noted.</p>
        </aside>
      </div>
    </div>
  );
}

function AddressFields({ addr, onChange }: { addr: Addr; onChange: (a: Addr) => void }) {
  const set = (k: keyof Addr, v: string) => onChange({ ...addr, [k]: v });
  return (
    <>
      <label className="co2-field"><span>Street address</span><input value={addr.line1} onChange={(e) => set("line1", e.target.value)} /></label>
      <label className="co2-field"><span>Apt / Suite (optional)</span><input value={addr.line2} onChange={(e) => set("line2", e.target.value)} /></label>
      <div className="co2-row">
        <label className="co2-field"><span>City</span><input value={addr.city} onChange={(e) => set("city", e.target.value)} /></label>
        <label className="co2-field"><span>State / Region</span><input value={addr.region} onChange={(e) => set("region", e.target.value)} /></label>
      </div>
      <div className="co2-row">
        <label className="co2-field"><span>ZIP / Postal</span><input value={addr.postal} onChange={(e) => set("postal", e.target.value)} /></label>
        <label className="co2-field"><span>Country</span><input value={addr.country} onChange={(e) => set("country", e.target.value)} /></label>
      </div>
    </>
  );
}

// Square Web Payments SDK card field. Only mounts when configured.
function SquareCard({ total, busy, onReady, onPay }: { total: number; busy: boolean; onReady: (api: { tokenize: () => Promise<{ status: string; token?: string }> }) => void; onPay: () => void }) {
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    const appId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID as string;
    const locId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID as string;
    const env = process.env.NEXT_PUBLIC_SQUARE_ENVIRONMENT === "production" ? "web" : "sandbox.web";
    const src = `https://${env}.squarecdn.com/v1/square.js`;

    function load(): Promise<void> {
      return new Promise((resolve, reject) => {
        if ((window as unknown as { Square?: unknown }).Square) return resolve();
        const s = document.createElement("script");
        s.src = src; s.onload = () => resolve(); s.onerror = () => reject(new Error("Could not load Square."));
        document.head.appendChild(s);
      });
    }

    (async () => {
      try {
        await load();
        const Square = (window as unknown as { Square: { payments: (a: string, l: string) => Promise<{ card: () => Promise<{ attach: (s: string) => Promise<void>; tokenize: () => Promise<{ status: string; token?: string }> }> }> } }).Square;
        const payments = await Square.payments(appId, locId);
        const card = await payments.card();
        if (cancelled) return;
        await card.attach("#sq-card");
        onReady({ tokenize: () => card.tokenize() });
        setReady(true);
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [onReady]);

  return (
    <div>
      {err && <div className="co2-error">{err}</div>}
      <div id="sq-card" className="co2-sqcard" />
      <button className="btn-gold" style={{ width: "100%", marginTop: "1rem" }} disabled={!ready || busy} onClick={onPay}>
        {busy ? "Processing…" : `Pay ${formatPrice(total)}`}
      </button>
      <p className="co2-note" style={{ marginTop: "0.6rem" }}>Card details are entered securely in Square&apos;s payment field — Magical Moments by Reign never sees your card number.</p>
    </div>
  );
}
