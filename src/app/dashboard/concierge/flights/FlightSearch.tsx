"use client";

// Flight search + TEST booking. All network calls go to our own member-gated
// server routes (/api/concierge/flights/*) — the Duffel token stays server-side.
// In test mode everything is clearly labeled: no real money, no real ticket.

import { useState } from "react";

interface OfferSlice { from: string; to: string; depart: string; arrive: string; stops: number; carriers: string[]; durationMins: number | null }
interface Offer { id: string; airline: string; airlineCode: string; price: string; amount: number; currency: string; slices: OfferSlice[] }

const fmtTime = (iso: string) => { try { return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); } catch { return iso; } };
const fmtDur = (m: number | null) => m == null ? "" : `${Math.floor(m / 60)}h ${m % 60}m`;

export default function FlightSearch() {
  const [form, setForm] = useState({ origin: "", destination: "", departureDate: "", returnDate: "", adults: 1, cabin: "economy" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [testMode, setTestMode] = useState(false);
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [ctx, setCtx] = useState<{ passengerIds: string[] } | null>(null);
  const [selected, setSelected] = useState<Offer | null>(null);
  const [pax, setPax] = useState<any[]>([]);
  const [booking, setBooking] = useState<{ ref: string; test: boolean } | null>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) { setForm((f) => ({ ...f, [k]: v })); }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setOffers(null); setSelected(null); setBooking(null);
    try {
      const res = await fetch("/api/concierge/flights/search", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Search failed."); return; }
      setTestMode(Boolean(data.testMode));
      setCtx({ passengerIds: data.passengerIds || [] });
      setOffers(data.offers || []);
    } catch { setError("Couldn't reach flight search. Please try again."); }
    finally { setBusy(false); }
  }

  function choose(o: Offer) {
    setSelected(o);
    const n = ctx?.passengerIds.length || 1;
    setPax(Array.from({ length: n }, () => ({ title: "mr", given_name: "", family_name: "", born_on: "", gender: "m", email: "", phone_number: "" })));
    setBooking(null); setError("");
  }
  function setPaxField(i: number, k: string, v: string) { setPax((p) => p.map((row, idx) => idx === i ? { ...row, [k]: v } : row)); }

  async function book(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !ctx) return;
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/concierge/flights/book", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId: selected.id, passengerIds: ctx.passengerIds, passengers: pax }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Booking failed."); return; }
      setBooking({ ref: data.bookingReference, test: Boolean(data.testMode) });
    } catch { setError("Couldn't complete the booking. Please try again."); }
    finally { setBusy(false); }
  }

  return (
    <div className="fl">
      {testMode && <div className="fl-test">Test mode — sample flights from Duffel. No real money and no real ticket are involved.</div>}

      {/* Search form */}
      <form className="fl-form card" onSubmit={search}>
        <div className="fl-row">
          <label className="fl-f"><span>From (airport code)</span><input value={form.origin} onChange={(e) => set("origin", e.target.value.toUpperCase())} placeholder="JFK" maxLength={3} required /></label>
          <label className="fl-f"><span>To (airport code)</span><input value={form.destination} onChange={(e) => set("destination", e.target.value.toUpperCase())} placeholder="LHR" maxLength={3} required /></label>
        </div>
        <div className="fl-row">
          <label className="fl-f"><span>Depart</span><input type="date" value={form.departureDate} onChange={(e) => set("departureDate", e.target.value)} required /></label>
          <label className="fl-f"><span>Return (optional)</span><input type="date" value={form.returnDate} onChange={(e) => set("returnDate", e.target.value)} /></label>
        </div>
        <div className="fl-row">
          <label className="fl-f"><span>Travelers</span>
            <select value={form.adults} onChange={(e) => set("adults", Number(e.target.value))}>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} adult{n > 1 ? "s" : ""}</option>)}</select>
          </label>
          <label className="fl-f"><span>Cabin</span>
            <select value={form.cabin} onChange={(e) => set("cabin", e.target.value)}>
              <option value="economy">Economy</option><option value="premium_economy">Premium Economy</option><option value="business">Business</option><option value="first">First</option>
            </select>
          </label>
        </div>
        <button type="submit" className="btn btn--gold" disabled={busy}>{busy && !selected ? "Searching…" : "Search flights"}</button>
      </form>

      {error && <p className="fl-error">{error}</p>}

      {/* Results */}
      {offers && !selected && (
        offers.length ? (
          <div className="fl-list">
            {offers.map((o) => (
              <div key={o.id} className="fl-offer">
                <div className="fl-offer__main">
                  <div className="fl-offer__air">{o.airline}</div>
                  {o.slices.map((s, i) => (
                    <div key={i} className="fl-leg">
                      <b>{s.from} → {s.to}</b> · {fmtTime(s.depart)} – {fmtTime(s.arrive)} · {s.stops === 0 ? "nonstop" : `${s.stops} stop${s.stops > 1 ? "s" : ""}`}{s.durationMins != null ? ` · ${fmtDur(s.durationMins)}` : ""}
                    </div>
                  ))}
                </div>
                <div className="fl-offer__buy">
                  <div className="fl-price">{o.price}</div>
                  <button type="button" className="btn btn--sm btn--gold" onClick={() => choose(o)}>Select</button>
                </div>
              </div>
            ))}
          </div>
        ) : <div className="empty"><p className="empty__t">No flights found</p><p className="empty__s">Try different dates or nearby airports.</p></div>
      )}

      {/* Passenger details + test booking */}
      {selected && !booking && (
        <form className="fl-form card" onSubmit={book}>
          <h3>Traveler details</h3>
          <p className="note">{selected.airline} · {selected.price}{testMode ? " · test booking (no real charge)" : ""}</p>
          {pax.map((p, i) => (
            <div key={i} className="fl-pax">
              <div className="fl-pax__h">Traveler {i + 1}</div>
              <div className="fl-row">
                <label className="fl-f"><span>Title</span><select value={p.title} onChange={(e) => setPaxField(i, "title", e.target.value)}><option value="mr">Mr</option><option value="ms">Ms</option><option value="mrs">Mrs</option><option value="miss">Miss</option><option value="dr">Dr</option></select></label>
                <label className="fl-f"><span>Gender</span><select value={p.gender} onChange={(e) => setPaxField(i, "gender", e.target.value)}><option value="m">Male</option><option value="f">Female</option></select></label>
              </div>
              <div className="fl-row">
                <label className="fl-f"><span>First name</span><input value={p.given_name} onChange={(e) => setPaxField(i, "given_name", e.target.value)} required /></label>
                <label className="fl-f"><span>Last name</span><input value={p.family_name} onChange={(e) => setPaxField(i, "family_name", e.target.value)} required /></label>
              </div>
              <div className="fl-row">
                <label className="fl-f"><span>Date of birth</span><input type="date" value={p.born_on} onChange={(e) => setPaxField(i, "born_on", e.target.value)} required /></label>
                <label className="fl-f"><span>Phone (+1…)</span><input value={p.phone_number} onChange={(e) => setPaxField(i, "phone_number", e.target.value)} placeholder="+14155550123" required /></label>
              </div>
              <label className="fl-f"><span>Email</span><input type="email" value={p.email} onChange={(e) => setPaxField(i, "email", e.target.value)} required /></label>
            </div>
          ))}
          <div className="pg-actions">
            <button type="submit" className="btn btn--gold" disabled={busy}>{busy ? "Reserving…" : testMode ? "Create test booking" : "Book"}</button>
            <button type="button" className="btn btn--ghost" onClick={() => setSelected(null)}>Back to results</button>
          </div>
        </form>
      )}

      {/* Confirmation */}
      {booking && (
        <div className="fl-done card">
          <div className="fl-done__badge">{booking.test ? "TEST BOOKING" : "Booked"}</div>
          <h3>Booking reference: {booking.ref}</h3>
          <p className="note">{booking.test ? "This is a Duffel test order — no real ticket was issued and no payment was taken. It confirms the booking flow works end to end." : "Your booking is confirmed."}</p>
          <button type="button" className="btn btn--ghost" onClick={() => { setSelected(null); setOffers(null); setBooking(null); }}>New search</button>
        </div>
      )}
    </div>
  );
}
