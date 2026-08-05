"use client";

// Luxury flight concierge — search + TEST booking. All network calls go to our
// own member-gated server routes (/api/concierge/flights/*); the Duffel token
// stays server-side. TEST MODE is labeled everywhere: no real ticket, no charge.
// All airline/price/schedule data comes from Duffel — never invented here.

import { useEffect, useRef, useState } from "react";

interface Place { name: string; iata: string; type: string; city?: string; country?: string }
interface OfferSlice { from: string; to: string; depart: string; arrive: string; stops: number; carriers: string[]; durationMins: number | null; layovers: string[] }
interface Offer { id: string; airline: string; airlineCode: string; airlineLogo: string | null; price: string; amount: number; currency: string; expiresAt: string | null; refundable: boolean | null; slices: OfferSlice[] }

interface TripService { label: string; emoji: string; href?: string; status: string }
interface Prefill { fromLabel?: string; fromIata?: string; toLabel?: string; toIata?: string; depart?: string; return?: string; adults?: number; cabin?: string; auto?: boolean }

const CABIN_LABEL: Record<string, string> = { economy: "Economy", premium_economy: "Premium Economy", business: "Business", first: "First Class" };
const fmtTime = (iso: string) => { try { return new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); } catch { return iso; } };
const fmtDur = (m: number | null) => m == null ? "" : `${Math.floor(m / 60)}h ${m % 60}m`;
const totalDur = (o: Offer) => o.slices.reduce((a, s) => a + (s.durationMins || 0), 0);
const totalStops = (o: Offer) => o.slices.reduce((a, s) => a + s.stops, 0);

// ── Place autocomplete (city / airport / landmark → IATA) ───────
function PlaceInput({ label, value, onChange, initialText }: { label: string; value: Place | null; onChange: (p: Place | null) => void; initialText?: string }) {
  const [q, setQ] = useState(value ? placeLabel(value) : (initialText || ""));
  const [opts, setOpts] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const t = useRef<any>(null);

  useEffect(() => { if (value) setQ(placeLabel(value)); }, [value]);

  function onType(v: string) {
    setQ(v); onChange(null); setOpen(true);
    if (t.current) clearTimeout(t.current);
    if (v.trim().length < 2) { setOpts([]); return; }
    t.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/concierge/flights/places?q=${encodeURIComponent(v)}`);
        const data = await res.json();
        setOpts(data.places || []);
      } catch { setOpts([]); }
    }, 250);
  }
  function pick(p: Place) { onChange(p); setQ(placeLabel(p)); setOpen(false); }

  return (
    <label className="fl-f fl-place">
      <span>{label}</span>
      <input value={q} onChange={(e) => onType(e.target.value)} onFocus={() => opts.length && setOpen(true)}
        placeholder="City, airport, or place — e.g. Orlando" autoComplete="off" />
      {open && opts.length > 0 && (
        <ul className="fl-ac" role="listbox">
          {opts.map((p) => (
            <li key={p.iata + p.name}><button type="button" onClick={() => pick(p)}>
              <span className="fl-ac__code">{p.iata}</span>
              <span className="fl-ac__name">{p.name}{p.city && p.city !== p.name ? ` · ${p.city}` : ""}{p.country ? `, ${p.country}` : ""}</span>
              <span className="fl-ac__type">{p.type === "airport" ? "Airport" : "City"}</span>
            </button></li>
          ))}
        </ul>
      )}
    </label>
  );
}
function placeLabel(p: Place) { return `${p.name} (${p.iata})`; }

export default function FlightSearch({ prefill, tripServices }: { prefill?: Prefill; tripServices: TripService[] }) {
  const [from, setFrom] = useState<Place | null>(prefill?.fromIata ? { name: prefill.fromLabel || prefill.fromIata, iata: prefill.fromIata, type: "city" } : null);
  const [to, setTo] = useState<Place | null>(prefill?.toIata ? { name: prefill.toLabel || prefill.toIata, iata: prefill.toIata, type: "city" } : null);
  const [dates, setDates] = useState({ depart: prefill?.depart || "", ret: prefill?.return || "" });
  const [adults, setAdults] = useState(prefill?.adults || 1);
  const [cabin, setCabin] = useState(prefill?.cabin || "economy");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [testMode, setTestMode] = useState(true);
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [searchedCabin, setSearchedCabin] = useState("economy");
  const [ctx, setCtx] = useState<{ passengerIds: string[] } | null>(null);

  const [sort, setSort] = useState("value");
  const [nonstopOnly, setNonstopOnly] = useState(false);
  const [refundableOnly, setRefundableOnly] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [compare, setCompare] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const [selected, setSelected] = useState<Offer | null>(null);
  const [pax, setPax] = useState<any[]>([]);
  const [booking, setBooking] = useState<{ ref: string; test: boolean } | null>(null);

  useEffect(() => { try { setSaved(JSON.parse(localStorage.getItem("mmr:saved-flights") || "[]")); } catch {} }, []);

  async function runSearch(f = from, tgt = to, d = dates, a = adults, c = cabin) {
    if (!f?.iata || !tgt?.iata || !d.depart) { setError("Tell me where you're leaving from, where you're going, and your departure date."); return; }
    setBusy(true); setError(""); setOffers(null); setSelected(null); setBooking(null); setCompare([]);
    try {
      const res = await fetch("/api/concierge/flights/search", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin: f.iata, destination: tgt.iata, departureDate: d.depart, returnDate: d.ret || undefined, adults: a, cabin: c }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Search failed."); return; }
      setTestMode(Boolean(data.testMode)); setSearchedCabin(c);
      setCtx({ passengerIds: data.passengerIds || [] });
      setOffers(data.offers || []);
    } catch { setError("Couldn't reach flight search. Please try again."); }
    finally { setBusy(false); }
  }

  // Assistant handoff: auto-run when the chat pre-filled a complete search.
  useEffect(() => {
    if (prefill?.auto && prefill.fromIata && prefill.toIata && prefill.depart) {
      runSearch(
        { name: prefill.fromLabel || prefill.fromIata, iata: prefill.fromIata, type: "city" },
        { name: prefill.toLabel || prefill.toIata, iata: prefill.toIata, type: "city" },
        { depart: prefill.depart, ret: prefill.return || "" },
        prefill.adults || 1, prefill.cabin || "economy",
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter + sort (client-side over REAL Duffel offers).
  const view = (offers || [])
    .filter((o) => !nonstopOnly || totalStops(o) === 0)
    .filter((o) => !refundableOnly || o.refundable === true)
    .slice()
    .sort((a, b) => {
      switch (sort) {
        case "price": return a.amount - b.amount;
        case "earliest": return (a.slices[0]?.depart || "").localeCompare(b.slices[0]?.depart || "");
        case "latest": return (b.slices[0]?.depart || "").localeCompare(a.slices[0]?.depart || "");
        case "duration": return totalDur(a) - totalDur(b);
        default: { // best value: price + duration + stops penalty (normalized)
          const score = (o: Offer) => o.amount + totalDur(o) * 1.5 + totalStops(o) * 120;
          return score(a) - score(b);
        }
      }
    });

  // Concierge recommendations — computed from REAL offers, nothing invented.
  const recs = offers && offers.length ? {
    cheapest: [...offers].sort((a, b) => a.amount - b.amount)[0],
    shortest: [...offers].sort((a, b) => totalDur(a) - totalDur(b))[0],
    nonstop: [...offers].filter((o) => totalStops(o) === 0).sort((a, b) => a.amount - b.amount)[0] || null,
    value: [...offers].sort((a, b) => (a.amount + totalDur(a) * 1.5 + totalStops(a) * 120) - (b.amount + totalDur(b) * 1.5 + totalStops(b) * 120))[0],
  } : null;

  function toggleSave(id: string) {
    setSaved((s) => { const n = s.includes(id) ? s.filter((x) => x !== id) : [...s, id]; try { localStorage.setItem("mmr:saved-flights", JSON.stringify(n)); } catch {} return n; });
  }
  function toggleCompare(id: string) { setCompare((c) => c.includes(id) ? c.filter((x) => x !== id) : c.length < 3 ? [...c, id] : c); }

  function choose(o: Offer) {
    setSelected(o);
    setPax(Array.from({ length: ctx?.passengerIds.length || 1 }, () => ({ title: "mr", given_name: "", family_name: "", born_on: "", gender: "m", email: "", phone_number: "" })));
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

  const compareOffers = (offers || []).filter((o) => compare.includes(o.id));

  return (
    <div className="fl">
      {testMode && <div className="fl-test">✦ TEST MODE — sample flights from Duffel. No real reservation, ticket, or charge is created.</div>}

      {/* Search */}
      <form className="fl-search" onSubmit={(e) => { e.preventDefault(); runSearch(); }}>
        <div className="fl-row">
          <PlaceInput label="Leaving From" value={from} onChange={setFrom} initialText={prefill?.fromLabel} />
          <PlaceInput label="Traveling To" value={to} onChange={setTo} initialText={prefill?.toLabel} />
        </div>
        <div className="fl-row">
          <label className="fl-f"><span>Depart</span><input type="date" value={dates.depart} onChange={(e) => setDates((d) => ({ ...d, depart: e.target.value }))} required /></label>
          <label className="fl-f"><span>Return <em>(optional)</em></span><input type="date" value={dates.ret} onChange={(e) => setDates((d) => ({ ...d, ret: e.target.value }))} /></label>
          <label className="fl-f"><span>Travelers</span><select value={adults} onChange={(e) => setAdults(Number(e.target.value))}>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} adult{n > 1 ? "s" : ""}</option>)}</select></label>
          <label className="fl-f"><span>Cabin</span><select value={cabin} onChange={(e) => setCabin(e.target.value)}>{Object.entries(CABIN_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        </div>
        <button type="submit" className="btn btn--gold fl-go" disabled={busy}>{busy && !selected ? "Comparing flights…" : "Search flights"}</button>
      </form>

      {error && <p className="fl-error">{error}</p>}

      {/* Results */}
      {offers && !selected && (
        offers.length ? (
          <>
            {/* Concierge recommendations */}
            {recs && (
              <div className="fl-recs">
                <div className="fl-recs__h">Your Concierge suggests</div>
                <div className="fl-recs__row">
                  <span><b>Lowest price</b> {recs.cheapest.price} · {recs.cheapest.airline}</span>
                  <span><b>Shortest trip</b> {fmtDur(totalDur(recs.shortest))} · {recs.shortest.airline}</span>
                  {recs.nonstop && <span><b>Best nonstop</b> {recs.nonstop.price} · {recs.nonstop.airline}</span>}
                  <span><b>Best value</b> {recs.value.price} · {recs.value.airline}</span>
                </div>
              </div>
            )}

            {/* Filters + sort */}
            <div className="fl-filters">
              <label className="fl-chip"><input type="checkbox" checked={nonstopOnly} onChange={(e) => setNonstopOnly(e.target.checked)} /> Nonstop only</label>
              <label className="fl-chip"><input type="checkbox" checked={refundableOnly} onChange={(e) => setRefundableOnly(e.target.checked)} /> Refundable only</label>
              <label className="fl-sort">Sort
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="value">Best value</option><option value="price">Lowest price</option>
                  <option value="duration">Shortest travel time</option><option value="earliest">Earliest departure</option>
                  <option value="latest">Latest departure</option>
                </select>
              </label>
              {compare.length >= 2 && <button type="button" className="btn btn--sm btn--ghost" onClick={() => setShowCompare(true)}>Compare ({compare.length})</button>}
            </div>

            <div className="fl-list">
              {view.map((o) => (
                <article key={o.id} className={`fl-card${compare.includes(o.id) ? " is-compare" : ""}`}>
                  <div className="fl-card__air">
                    {o.airlineLogo ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={o.airlineLogo} alt="" width={26} height={26} /> : <span className="fl-card__ac">{o.airlineCode}</span>}
                    <span>{o.airline}</span>
                    <span className="fl-cabin">{CABIN_LABEL[searchedCabin]}</span>
                  </div>
                  <div className="fl-card__legs">
                    {o.slices.map((s, i) => (
                      <div key={i} className="fl-leg">
                        <div className="fl-leg__route"><b>{s.from}</b> <span aria-hidden="true">→</span> <b>{s.to}</b></div>
                        <div className="fl-leg__time">{fmtTime(s.depart)} — {fmtTime(s.arrive)}</div>
                        <div className="fl-leg__meta">{fmtDur(s.durationMins)} · {s.stops === 0 ? "Nonstop" : `${s.stops} stop${s.stops > 1 ? "s" : ""}${s.layovers.length ? ` (${s.layovers.join(", ")})` : ""}`}{s.carriers.length > 1 ? ` · ${s.carriers.join(", ")}` : ""}</div>
                      </div>
                    ))}
                  </div>
                  <div className="fl-card__buy">
                    <div className="fl-price">{o.price}<small>{o.currency}</small></div>
                    {o.refundable != null && <div className={`fl-refund fl-refund--${o.refundable ? "y" : "n"}`}>{o.refundable ? "Refundable" : "Non-refundable"}</div>}
                    <button type="button" className="btn btn--gold btn--sm" onClick={() => choose(o)}>Select flight</button>
                    <div className="fl-card__mini">
                      <button type="button" className={saved.includes(o.id) ? "is-on" : ""} onClick={() => toggleSave(o.id)}>{saved.includes(o.id) ? "★ Saved" : "☆ Save"}</button>
                      <label><input type="checkbox" checked={compare.includes(o.id)} onChange={() => toggleCompare(o.id)} /> Compare</label>
                    </div>
                    {o.expiresAt && <div className="fl-exp">Offer held until {fmtTime(o.expiresAt)}</div>}
                  </div>
                </article>
              ))}
            </div>
            <p className="note">Showing {view.length} of {offers.length} test offers · Save, Share with family, add to your Magical Tracker &amp; associate with a Journey — <b>Coming Soon</b>.</p>
          </>
        ) : (
          <div className="empty"><div className="empty__mark"><svg viewBox="0 0 24 24"><path d="M2 16l20-7-9 13-2-6-9-0z" /></svg></div><p className="empty__t">No flights found</p><p className="empty__s">Try different dates or a nearby city.</p></div>
        )
      )}

      {/* Compare panel */}
      {showCompare && compareOffers.length >= 2 && (
        <div className="fl-modal" role="dialog" aria-label="Compare flights" onClick={() => setShowCompare(false)}>
          <div className="fl-modal__in" onClick={(e) => e.stopPropagation()}>
            <div className="fl-modal__h"><h3>Compare flights</h3><button type="button" onClick={() => setShowCompare(false)}>×</button></div>
            <div className="fl-comp">
              {compareOffers.map((o) => (
                <div key={o.id} className="fl-comp__col">
                  <div className="fl-comp__air">{o.airline}</div>
                  <div className="fl-price">{o.price}</div>
                  <div>Total {fmtDur(totalDur(o))}</div>
                  <div>{totalStops(o) === 0 ? "Nonstop" : `${totalStops(o)} stop(s)`}</div>
                  <div>{o.refundable == null ? "Refund: n/a" : o.refundable ? "Refundable" : "Non-refundable"}</div>
                  <button type="button" className="btn btn--sm btn--gold" onClick={() => { setShowCompare(false); choose(o); }}>Select</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Traveler details + TEST booking */}
      {selected && !booking && (
        <form className="fl-search" onSubmit={book}>
          <div className="fl-test">TEST MODE — This is a simulated booking. No real reservation, ticket, or charge will be created.</div>
          <h3>Review &amp; traveler details</h3>
          <p className="note">{selected.airline} · {selected.slices.map((s) => `${s.from}→${s.to}`).join(", ")} · {selected.price} {selected.currency}</p>
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

          {/* Payment options preview — honest statuses, none live for the test booking */}
          <div className="fl-pay">
            <div className="fl-pay__h">Choose How You&rsquo;d Like to Pay</div>
            <div className="fl-pay__grid">
              <span className="fl-pay__opt is-test">Pay in Full (test) · Test Mode</span>
              {["PayPal", "PayPal Pay Later", "Affirm", "Afterpay", "Klarna", "Apple Pay", "Google Pay", "Credit or Debit Card"].map((m) => (
                <span key={m} className="fl-pay__opt is-soon">{m} · Coming Soon</span>
              ))}
            </div>
            <p className="note">Payment-plan options are subject to provider approval and availability. No payment method is charged for a test booking.</p>
          </div>

          <div className="pg-actions">
            <button type="submit" className="btn btn--gold" disabled={busy}>{busy ? "Reserving…" : "Create test booking"}</button>
            <button type="button" className="btn btn--ghost" onClick={() => setSelected(null)}>Back to results</button>
          </div>
        </form>
      )}

      {/* Confirmation + trip building */}
      {booking && (
        <div className="fl-done fl-search">
          <div className="fl-done__badge">{booking.test ? "TEST BOOKING" : "Booked"}</div>
          <h3>Booking reference: {booking.ref}</h3>
          <p className="note">{booking.test ? "This is a Duffel test order — no real ticket was issued and no payment was taken. It confirms the booking flow works end to end." : "Your booking is confirmed."}</p>

          <div className="fl-trip">
            <div className="fl-trip__h">Would you like to complete the rest of your trip?</div>
            <div className="fl-trip__grid">
              {tripServices.map((s) => (
                s.href && s.status !== "coming_soon"
                  ? <a key={s.label} className="fl-trip__item" href={s.href}>{s.emoji} {s.label}</a>
                  : <span key={s.label} className="fl-trip__item is-soon">{s.emoji} {s.label} · Coming Soon</span>
              ))}
            </div>
          </div>
          <button type="button" className="btn btn--ghost" onClick={() => { setSelected(null); setOffers(null); setBooking(null); }}>New search</button>
        </div>
      )}
    </div>
  );
}
