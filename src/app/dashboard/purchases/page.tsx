import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/site/SiteNav";
import {
  getPurchaseBundle, arrivingSoon, statusLabel, formatMoney,
  ORDER_STATUSES, WISHLIST_CATEGORIES,
} from "@/lib/purchases";
import {
  savePurchaseAction, setStatusAction, deletePurchaseAction,
  addWishlistAction, deleteWishlistAction,
} from "./actions";
import "./purchases.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Purchase Concierge", robots: { index: false } };

const journeyTitle = (journeys: { slug: string; title: string }[], id: string | null) =>
  id ? journeys.find((j) => j.slug === id)?.title : undefined;

export default async function PurchasesPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const { purchases, wishlist, journeys } = await getPurchaseBundle();
  const editing = edit ? purchases.find((p) => p.id === edit) : undefined;
  const soon = arrivingSoon(purchases, new Date());
  const active = purchases.filter((p) => p.status !== "completed");

  return (
    <div className="pc">
      <SiteNav />
      <header className="pc-header">
        <div className="container">
          <Link href="/dashboard" className="pc-back">← Back to your studio</Link>
          <span className="eyebrow" style={{ color: "var(--gold-soft)" }}>Purchase Concierge</span>
          <h1>Every order, organized</h1>
          <p>Buy from any merchant, then connect the order here so it lives with the Journey it belongs to. Track deliveries, warranties, and return windows — never miss a thing.</p>
        </div>
      </header>

      <main className="container pc-main">
        <div className="pc-stats">
          <div className="pc-stat"><b>{active.length}</b><span>Active orders</span></div>
          <div className="pc-stat"><b>{soon.length}</b><span>Arriving this week</span></div>
          <div className="pc-stat"><b>{wishlist.length}</b><span>Wishlist items</span></div>
          <div className="pc-stat"><b>{purchases.length}</b><span>Total tracked</span></div>
        </div>

        {soon.length > 0 && (
          <div className="pc-banner">📦 Arriving soon: {soon.map((p) => p.product).join(", ")}.</div>
        )}

        {/* Add / edit a purchase */}
        <section className="pc-section">
          <h2>{editing ? "Edit purchase" : "Connect a purchase"}</h2>
          <p className="pc-muted">We never replace the merchant — add an order you&apos;ve placed so it&apos;s tracked alongside your Journey.</p>
          <form action={savePurchaseAction} className="pc-form">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="pc-grid">
              <label className="pc-field pc-field--wide"><span>Product *</span><input name="product" defaultValue={editing?.product ?? ""} required placeholder="Wedding dress" /></label>
              <label className="pc-field"><span>Store</span><input name="store" defaultValue={editing?.store ?? ""} placeholder="BHLDN" /></label>
              <label className="pc-field"><span>Journey</span>
                <select name="experienceId" defaultValue={editing?.experienceId ?? ""}>
                  <option value="">— None —</option>
                  {journeys.map((j) => <option key={j.slug} value={j.slug}>{j.title}</option>)}
                </select>
              </label>
              <label className="pc-field"><span>Order date</span><input type="date" name="orderDate" defaultValue={editing?.orderDate ?? ""} /></label>
              <label className="pc-field"><span>Est. delivery</span><input type="date" name="estDelivery" defaultValue={editing?.estDelivery ?? ""} /></label>
              <label className="pc-field"><span>Price</span><input name="price" defaultValue={editing?.price != null ? String(editing.price) : ""} placeholder="$1,200" /></label>
              <label className="pc-field"><span>Tracking #</span><input name="tracking" defaultValue={editing?.tracking ?? ""} /></label>
              <label className="pc-field"><span>Warranty</span><input name="warranty" defaultValue={editing?.warranty ?? ""} placeholder="1 year" /></label>
              <label className="pc-field"><span>Return window</span><input name="returnWindow" defaultValue={editing?.returnWindow ?? ""} placeholder="30 days" /></label>
              <label className="pc-field"><span>Status</span>
                <select name="status" defaultValue={editing?.status ?? "confirmed"}>
                  {ORDER_STATUSES.map((st) => <option key={st.id} value={st.id}>{st.label}</option>)}
                </select>
              </label>
              <label className="pc-field pc-field--wide"><span>Notes</span><input name="notes" defaultValue={editing?.notes ?? ""} /></label>
            </div>
            <div className="pc-formfoot">
              <button type="submit" className="btn-gold">{editing ? "Save changes" : "Add purchase"}</button>
              {editing && <Link href="/dashboard/purchases" className="pc-linkbtn">Cancel</Link>}
            </div>
          </form>
        </section>

        {/* Purchase Center */}
        <section className="pc-section">
          <h2>Purchase Center</h2>
          {purchases.length === 0 ? (
            <p className="pc-muted">No purchases yet. Connect your first order above and it appears here with Smart Order Tracking.</p>
          ) : (
            <div className="pc-list">
              {purchases.map((p) => {
                const jt = journeyTitle(journeys, p.experienceId);
                return (
                  <div key={p.id} className="pc-card">
                    <div className="pc-card__top">
                      <div>
                        <div className="pc-card__product">{p.product}</div>
                        <div className="pc-card__meta">
                          {p.store && <span>{p.store}</span>}
                          {jt && <span className="pc-tag">{jt}</span>}
                          {p.price != null && <span>{formatMoney(p.price)}</span>}
                        </div>
                      </div>
                      <span className={`pc-status pc-status--${p.status}`}>{statusLabel(p.status)}</span>
                    </div>
                    <div className="pc-card__facts">
                      {p.orderDate && <span><b>Ordered</b> {p.orderDate}</span>}
                      {p.estDelivery && <span><b>Est. delivery</b> {p.estDelivery}</span>}
                      {p.tracking && <span><b>Tracking</b> {p.tracking}</span>}
                      {p.warranty && <span><b>Warranty</b> {p.warranty}</span>}
                      {p.returnWindow && <span><b>Return</b> {p.returnWindow}</span>}
                    </div>
                    {p.notes && <p className="pc-card__notes">{p.notes}</p>}
                    <div className="pc-card__actions">
                      <form action={setStatusAction} className="pc-inline">
                        <input type="hidden" name="id" value={p.id} />
                        <select name="status" defaultValue={p.status} aria-label="Update status">
                          {ORDER_STATUSES.map((st) => <option key={st.id} value={st.id}>{st.label}</option>)}
                        </select>
                        <button type="submit" className="pc-linkbtn">Update</button>
                      </form>
                      <Link href={`/dashboard/purchases?edit=${p.id}`} className="pc-linkbtn">Edit</Link>
                      <form action={deletePurchaseAction}><input type="hidden" name="id" value={p.id} /><button type="submit" className="pc-linkbtn pc-linkbtn--danger">Remove</button></form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Wishlists */}
        <section className="pc-section">
          <h2>Wishlists</h2>
          <p className="pc-muted">Save products to consider before you buy — compare and decide when you&apos;re ready.</p>
          <form action={addWishlistAction} className="pc-form">
            <div className="pc-grid">
              <label className="pc-field pc-field--wide"><span>Item *</span><input name="name" required placeholder="Convertible crib" /></label>
              <label className="pc-field"><span>List</span>
                <select name="category" defaultValue="Baby">{WISHLIST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              </label>
              <label className="pc-field"><span>Store</span><input name="store" placeholder="Pottery Barn" /></label>
              <label className="pc-field"><span>Price</span><input name="price" placeholder="$399" /></label>
              <label className="pc-field pc-field--wide"><span>Link</span><input name="url" placeholder="https://…" /></label>
              <label className="pc-field pc-field--wide"><span>Notes</span><input name="notes" /></label>
            </div>
            <div className="pc-formfoot"><button type="submit" className="btn-gold">Add to wishlist</button></div>
          </form>

          {wishlist.length > 0 && (
            <div className="pc-wish">
              {wishlist.map((w) => (
                <div key={w.id} className="pc-wishcard">
                  <span className="pc-tag">{w.category}</span>
                  <div className="pc-wishcard__name">{w.url ? <a href={w.url} target="_blank" rel="noopener noreferrer">{w.name}</a> : w.name}</div>
                  <div className="pc-wishcard__meta">{w.store}{w.store && w.price != null ? " · " : ""}{w.price != null ? formatMoney(w.price) : ""}</div>
                  {w.notes && <p className="pc-wishcard__notes">{w.notes}</p>}
                  <form action={deleteWishlistAction}><input type="hidden" name="id" value={w.id} /><button type="submit" className="pc-linkbtn pc-linkbtn--danger">Remove</button></form>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="pc-disclaimer">Purchase Concierge helps you stay organized — it does not process merchant payments or ship goods. Price comparison, member savings, in-app returns, and payment options unlock through future trusted-merchant partnerships; until then we link you to the merchant&apos;s official process. Always verify final pricing, warranty, and return terms with the merchant.</p>
      </main>
    </div>
  );
}
