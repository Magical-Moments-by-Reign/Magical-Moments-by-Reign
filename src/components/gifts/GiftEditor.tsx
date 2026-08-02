"use client";

import { useState } from "react";
import { saveGiftsAction } from "@/app/dashboard/[slug]/gifts/actions";
import {
  GIFT_MODES, VISIBILITY_OPTIONS, CASH_PLATFORMS, PRIORITIES,
  REGISTRY_SUGGESTIONS, type GiftData, type Registry, type CashMethod, type CashPlatform,
  type GiftItem, type Charity,
} from "@/lib/gifts";

const newId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `g${Date.now()}${Math.floor(Math.random() * 1000)}`);

export default function GiftEditor({ slug, initial }: { slug: string; initial: GiftData }) {
  const [mode, setMode] = useState(initial.mode === "none" ? "both" : initial.mode);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [visibility, setVisibility] = useState(initial.visibility);
  const [message, setMessage] = useState(initial.message);
  const [registries, setRegistries] = useState<Registry[]>(initial.registries.length ? initial.registries : []);
  const [cash, setCash] = useState<CashMethod[]>(initial.cashMethods);
  const [items, setItems] = useState<GiftItem[]>(initial.items ?? []);
  const [charity, setCharity] = useState<Charity>(initial.charity ?? { name: "" });

  const addItem = () => setItems((x) => [...x, { id: newId(), name: "", priority: "medium" }]);
  const setItem = (i: number, patch: Partial<GiftItem>) => setItems((x) => x.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const rmItem = (i: number) => setItems((x) => x.filter((_, j) => j !== i));

  const showRegistry = mode === "registry" || mode === "both";
  const showCash = mode === "cash" || mode === "both";

  const addRegistry = () => setRegistries((r) => [...r, { label: "", url: "" }]);
  const setReg = (i: number, patch: Partial<Registry>) => setRegistries((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const rmReg = (i: number) => setRegistries((r) => r.filter((_, j) => j !== i));

  const cashHandle = (p: CashPlatform) => cash.find((c) => c.platform === p)?.handle ?? "";
  const setCashHandle = (p: CashPlatform, handle: string) =>
    setCash((c) => {
      const others = c.filter((x) => x.platform !== p);
      return handle.trim() ? [...others, { platform: p, handle }] : others;
    });

  return (
    <form action={saveGiftsAction} className="ge-form">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="registries" value={JSON.stringify(registries)} />
      <input type="hidden" name="cashMethods" value={JSON.stringify(cash)} />
      <input type="hidden" name="items" value={JSON.stringify(items.filter((i) => i.name.trim()))} />
      <input type="hidden" name="charity" value={charity.name.trim() ? JSON.stringify(charity) : ""} />

      <fieldset className="ge-block">
        <legend>Would you like to receive gifts for this journey?</legend>
        <div className="ge-modes">
          {GIFT_MODES.filter((m) => m.id !== "none").map((m) => (
            <label key={m.id} className={`ge-mode${mode === m.id ? " is-on" : ""}`}>
              <input type="radio" name="mode" value={m.id} checked={mode === m.id} onChange={() => setMode(m.id)} />
              {m.label}
            </label>
          ))}
        </div>
        <p className="ge-hint">Gifts are always optional. You can turn this off or change it anytime.</p>
      </fieldset>

      {showRegistry && (
        <fieldset className="ge-block">
          <legend>Gift registries</legend>
          {registries.map((r, i) => (
            <div className="ge-reg" key={i}>
              <input list="reg-suggestions" placeholder="Registry name (e.g. Amazon)" value={r.label} onChange={(e) => setReg(i, { label: e.target.value })} />
              <input placeholder="https://…" value={r.url} onChange={(e) => setReg(i, { url: e.target.value })} />
              <button type="button" className="ge-rm" onClick={() => rmReg(i)} aria-label="Remove">✕</button>
            </div>
          ))}
          <datalist id="reg-suggestions">{REGISTRY_SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
          <button type="button" className="ge-add" onClick={addRegistry}>+ Add a registry</button>
        </fieldset>
      )}

      {showCash && (
        <fieldset className="ge-block">
          <legend>Cash gifts</legend>
          <p className="ge-hint">Enter your own handles. Magical Moments never holds or processes funds — guests are sent straight to your app.</p>
          <div className="ge-cash">
            {CASH_PLATFORMS.map((c) => (
              <label className="ge-cashrow" key={c.id}>
                <span>{c.label}</span>
                <input placeholder={c.placeholder} value={cashHandle(c.id)} onChange={(e) => setCashHandle(c.id, e.target.value)} />
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="ge-block">
        <legend>Individual gift ideas <em>(optional)</em></legend>
        <p className="ge-hint">Add specific items with a link. Mark one purchased once someone gives it, so guests don&apos;t double-buy.</p>
        {items.map((it, i) => (
          <div className="ge-item" key={it.id}>
            <div className="ge-item__row">
              <input placeholder="Gift name" value={it.name} onChange={(e) => setItem(i, { name: e.target.value })} />
              <input placeholder="Store" value={it.store ?? ""} onChange={(e) => setItem(i, { store: e.target.value })} />
              <input placeholder="Price" value={it.price ?? ""} onChange={(e) => setItem(i, { price: e.target.value })} />
              <button type="button" className="ge-rm" onClick={() => rmItem(i)} aria-label="Remove">✕</button>
            </div>
            <div className="ge-item__row">
              <input placeholder="Purchase link (https://…)" value={it.url ?? ""} onChange={(e) => setItem(i, { url: e.target.value })} />
              <select value={it.priority ?? "medium"} onChange={(e) => setItem(i, { priority: e.target.value as GiftItem["priority"] })}>
                {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
              <label className="ge-itemcheck"><input type="checkbox" checked={!!it.purchased} onChange={(e) => setItem(i, { purchased: e.target.checked })} /> Purchased</label>
            </div>
          </div>
        ))}
        <button type="button" className="ge-add" onClick={addItem}>+ Add a gift idea</button>
      </fieldset>

      <fieldset className="ge-block">
        <legend>Charitable giving <em>(optional)</em></legend>
        <p className="ge-hint">Feature a cause — perfect for memorials, or &ldquo;in lieu of gifts.&rdquo;</p>
        <div className="ge-charity">
          <input placeholder="Charity or fund name" value={charity.name} onChange={(e) => setCharity((c) => ({ ...c, name: e.target.value }))} />
          <input placeholder="Donation link (https://…)" value={charity.url ?? ""} onChange={(e) => setCharity((c) => ({ ...c, url: e.target.value }))} />
          <input placeholder="Cause / description" value={charity.cause ?? ""} onChange={(e) => setCharity((c) => ({ ...c, cause: e.target.value }))} />
          <div className="ge-item__row">
            <input placeholder="Goal (e.g. $5,000)" value={charity.goal ?? ""} onChange={(e) => setCharity((c) => ({ ...c, goal: e.target.value }))} />
            <input placeholder="Raised (e.g. $1,200)" value={charity.raised ?? ""} onChange={(e) => setCharity((c) => ({ ...c, raised: e.target.value }))} />
          </div>
        </div>
      </fieldset>

      <fieldset className="ge-block">
        <legend>A personal message <em>(optional)</em></legend>
        <textarea name="message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)}
          placeholder="Your presence is the greatest gift, but if you'd like to bless us, we've included a few options below." />
      </fieldset>

      <div className="ge-row">
        <label className="ge-field">
          <span>Who can see this?</span>
          <select name="visibility" value={visibility} onChange={(e) => setVisibility(e.target.value as GiftData["visibility"])}>
            {VISIBILITY_OPTIONS.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </label>
        <label className="ge-toggle">
          <input type="checkbox" name="enabled" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          <span>Show the Gifts &amp; Registry section on my experience</span>
        </label>
      </div>

      <button type="submit" className="btn-gold">Save gift settings ✦</button>
    </form>
  );
}
