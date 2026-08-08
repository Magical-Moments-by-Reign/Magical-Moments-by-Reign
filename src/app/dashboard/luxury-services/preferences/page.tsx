import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { getPreferences } from "@/lib/luxury/preferences";
import { savePreferencesAction } from "./actions";
import "../luxury.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Luxury Preferences", robots: { index: false } };

export default async function PreferencesPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const account = await requireAccount("/dashboard/luxury-services/preferences");
  const { saved } = await searchParams;
  const p = await getPreferences(account.id);

  return (
    <div className="lx">
      <div className="lxp-crumb">
        <Link href="/dashboard/luxury-services">← Luxury Services</Link>
        <span aria-hidden="true">⤳</span>
        <b>My Luxury Preferences</b>
      </div>

      <header className="lxp-hero" style={{ backgroundImage: "linear-gradient(135deg, #2f2015, #17100a)" }}>
        <h1 className="lxp-hero__title">My Luxury Preferences</h1>
        <div className="lxp-hero__rule">✦ ✦ ✦</div>
        <p className="lxp-hero__sub">Tell us how you love to travel and dine — once. Journey applies these to every search automatically, and you can always change them for a single trip. You&apos;ll never re-enter them.</p>
      </header>

      {saved && <div className="cx-honest" style={{ marginBottom: "1.2rem" }}>Saved. Journey will use these preferences on your searches from now on.</div>}

      <form action={savePreferencesAction} className="lxp-card" style={{ display: "flex", flexDirection: "column", gap: "1.4rem" }}>
        <fieldset className="lv-fieldset">
          <legend>Hotels</legend>
          <div className="cx-form__grid">
            <label className="cx-field"><span className="cx-field__label">Minimum star rating</span>
              <select name="h_minStar" defaultValue={p.hotel.minStar ?? ""}><option value="">Any</option><option>3+</option><option>4+</option><option>5 only</option></select></label>
            <label className="cx-field"><span className="cx-field__label">Preferred brands</span><input name="h_brands" defaultValue={p.hotel.brands ?? ""} placeholder="Four Seasons, Ritz-Carlton…" /></label>
            <label className="cx-field"><span className="cx-field__label">Room preferences</span><input name="h_room" defaultValue={p.hotel.room ?? ""} placeholder="High floor, suite, quiet…" /></label>
            <label className="cx-field"><span className="cx-field__label">Budget / night</span><input name="h_budget" defaultValue={p.hotel.budget ?? ""} placeholder="e.g. up to $600" /></label>
            <label className="cx-field"><span className="cx-field__label">Smoking</span>
              <select name="h_smoking" defaultValue={p.hotel.smoking ?? ""}><option value="">No preference</option><option>Non-smoking</option><option>Smoking</option></select></label>
            <label className="cx-field"><span className="cx-field__label">Bed</span>
              <select name="h_bed" defaultValue={p.hotel.bed ?? ""}><option value="">No preference</option><option>King</option><option>Queen</option><option>Two beds</option></select></label>
            <label className="cx-field"><span className="cx-field__label">Accessibility needs</span><input name="h_accessibility" defaultValue={p.hotel.accessibility ?? ""} placeholder="Roll-in shower, ADA room…" /></label>
          </div>
        </fieldset>

        <fieldset className="lv-fieldset">
          <legend>Flights</legend>
          <div className="cx-form__grid">
            <label className="cx-field"><span className="cx-field__label">Preferred airlines</span><input name="f_airlines" defaultValue={p.flight.airlines ?? ""} placeholder="Delta, Emirates…" /></label>
            <label className="cx-field"><span className="cx-field__label">Seat</span>
              <select name="f_seat" defaultValue={p.flight.seat ?? ""}><option value="">No preference</option><option>Aisle</option><option>Window</option></select></label>
            <label className="cx-field"><span className="cx-field__label">Cabin class</span>
              <select name="f_cabin" defaultValue={p.flight.cabin ?? ""}><option value="">No preference</option><option>Economy</option><option>Premium Economy</option><option>Business</option><option>First</option></select></label>
            <label className="cx-field"><span className="cx-field__label">Airport preferences</span><input name="f_airports" defaultValue={p.flight.airports ?? ""} placeholder="Home airports, avoid…" /></label>
            <label className="cx-field"><span className="cx-field__label">TSA PreCheck / Global Entry</span><input name="f_tsa" defaultValue={p.flight.tsa ?? ""} placeholder="Known Traveler Number" /></label>
            <label className="cx-field"><span className="cx-field__label">Meal preferences</span><input name="f_meal" defaultValue={p.flight.meal ?? ""} placeholder="Vegetarian, kosher…" /></label>
          </div>
        </fieldset>

        <fieldset className="lv-fieldset">
          <legend>Restaurants</legend>
          <div className="cx-form__grid">
            <label className="cx-field"><span className="cx-field__label">Minimum review rating</span>
              <select name="r_minRating" defaultValue={p.restaurant.minRating ?? ""}><option value="">Any</option><option>3+</option><option>4+</option><option>4.5+</option></select></label>
            <label className="cx-field"><span className="cx-field__label">Favorite cuisines</span><input name="r_cuisines" defaultValue={p.restaurant.cuisines ?? ""} placeholder="Italian, sushi, steakhouse…" /></label>
            <label className="cx-field"><span className="cx-field__label">Dietary restrictions</span><input name="r_dietary" defaultValue={p.restaurant.dietary ?? ""} placeholder="Gluten-free, vegan…" /></label>
            <label className="cx-field"><span className="cx-field__label">Search radius</span>
              <select name="r_radius" defaultValue={p.restaurant.radius ?? ""}><option value="">No preference</option><option>Nearby</option><option>Within 5 miles</option><option>Within 10 miles</option><option>Entire city</option></select></label>
          </div>
        </fieldset>

        <fieldset className="lv-fieldset">
          <legend>Rental cars</legend>
          <div className="cx-form__grid">
            <label className="cx-field"><span className="cx-field__label">Vehicle type</span><input name="c_vehicleType" defaultValue={p.rentalCar.vehicleType ?? ""} placeholder="SUV, luxury sedan…" /></label>
            <label className="cx-field"><span className="cx-field__label">Favorite rental companies</span><input name="c_companies" defaultValue={p.rentalCar.companies ?? ""} placeholder="Hertz, Enterprise…" /></label>
          </div>
        </fieldset>

        <fieldset className="lv-fieldset">
          <legend>Vacation homes</legend>
          <div className="cx-form__grid">
            <label className="cx-field"><span className="cx-field__label">Property preferences</span><input name="v_property" defaultValue={p.vacationHome.property ?? ""} placeholder="Pool, 4+ bedrooms, waterfront…" /></label>
          </div>
        </fieldset>

        <fieldset className="lv-fieldset">
          <legend>Payment</legend>
          <div className="cx-form__grid">
            <label className="cx-field"><span className="cx-field__label">Preferred payment methods</span><input name="p_methods" defaultValue={p.payment.methods ?? ""} placeholder="Amex Platinum, Visa ending 1234…" /></label>
          </div>
          <p className="lv-microcopy">Journey uses this only to know your preference — no payment is ever charged without Purchase Review.</p>
        </fieldset>

        <div className="lv-form__actions"><button type="submit" className="btn btn--gold">Save my preferences</button></div>
      </form>
    </div>
  );
}
