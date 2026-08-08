import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { listContacts } from "@/lib/live/contacts";
import { createContactAction, deleteContactAction, toggleFavoriteAction } from "./actions";
import "../live.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Magical Family", robots: { index: false } };

const METHOD_LABEL: Record<string, string> = { sms: "Text", email: "Email", both: "Both", ask: "Ask each time" };

export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const account = await requireAccount("/dashboard/live/contacts");
  const { q } = await searchParams;
  const contacts = await listContacts(account.id, q);

  return (
    <div className="lv-page">
      <div className="pg-head">
        <Link href="/dashboard/live" className="cx-back">← Magical Live</Link>
        <span className="pg-eyebrow">✦ My Magical Family</span>
        <h1 className="pg-title">My Magical Family</h1>
        <p className="pg-sub">Save the people you invite most, once — then add them to any Magical Live with a tap. We&apos;ll reach each person the way they prefer, so you never re-enter their details.</p>
      </div>

      {/* Add a person */}
      <section className="sec">
        <div className="sec__h"><h2 className="sec__t">Add someone</h2></div>
        <form action={createContactAction} className="lv-invite-form">
          <div className="lv-fieldrow">
            <label className="lv-field"><span>First name *</span><input name="firstName" required placeholder="Nana" /></label>
            <label className="lv-field"><span>Last name</span><input name="lastName" placeholder="Thompson" /></label>
            <label className="lv-field"><span>Relationship / tag</span><input name="relationship" placeholder="Grandmother" /></label>
          </div>
          <div className="lv-fieldrow">
            <label className="lv-field"><span>Email</span><input name="email" type="email" placeholder="nana@email.com" /></label>
            <label className="lv-field"><span>Mobile</span><input name="phone" placeholder="(305) 555-0142" /></label>
            <label className="lv-field"><span>Preferred invitation method</span>
              <select name="preferredMethod" defaultValue="ask">
                <option value="ask">Ask each time</option>
                <option value="email">Email</option>
                <option value="sms">Text message</option>
                <option value="both">Both</option>
              </select>
            </label>
          </div>
          <div className="lv-fieldrow">
            <label className="lv-field"><span>Groups (comma-separated)</span><input name="groups" placeholder="Family, Wedding party" /></label>
            <label className="lv-check" style={{ alignSelf: "end" }}><input type="checkbox" name="favorite" /> Mark as favorite ★</label>
          </div>
          <div className="lv-form__actions"><button type="submit" className="btn btn--gold">Save to My Magical Family</button></div>
        </form>
      </section>

      {/* Search + list */}
      <section className="sec">
        <div className="sec__h"><h2 className="sec__t">Saved people {contacts.length ? `(${contacts.length})` : ""}</h2></div>
        <form method="GET" className="lv-copy" style={{ marginBottom: "1rem" }}>
          <input name="q" defaultValue={q ?? ""} placeholder="Search by name, email, phone, tag, or group…" aria-label="Search contacts" />
          <button type="submit" className="btn btn--ghost btn--sm">Search</button>
        </form>

        {contacts.length === 0 ? (
          <p className="lv-empty">{q ? "No matches." : "No saved people yet. Add your family above and they'll be one tap away for every Magical Live."}</p>
        ) : (
          <div className="lv-guests">
            {contacts.map((c) => (
              <div key={c.id} className="lv-guest">
                <span className="lv-guest__main">
                  <span className="lv-guest__name">{c.favorite ? "★ " : ""}{c.firstName} {c.lastName ?? ""}{c.relationship ? ` · ${c.relationship}` : ""}</span>
                  <span className="lv-guest__contact">
                    {[c.email, c.phone].filter(Boolean).join(" · ") || "No contact on file"} · Prefers {METHOD_LABEL[c.preferredMethod]}
                    {c.groups.length ? ` · ${c.groups.join(", ")}` : ""}
                  </span>
                </span>
                <span className="lv-guest__actions">
                  <form action={toggleFavoriteAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className="btn btn--ghost btn--sm">{c.favorite ? "Unfavorite" : "Favorite ★"}</button>
                  </form>
                  <form action={deleteContactAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className="btn btn--warn btn--sm">Remove</button>
                  </form>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
