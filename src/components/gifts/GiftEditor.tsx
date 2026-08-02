"use client";

import { useState } from "react";
import { saveGiftsAction } from "@/app/dashboard/[slug]/gifts/actions";
import {
  GIFT_MODES, VISIBILITY_OPTIONS, CASH_PLATFORMS,
  REGISTRY_SUGGESTIONS, type GiftData, type Registry, type CashMethod, type CashPlatform,
} from "@/lib/gifts";

export default function GiftEditor({ slug, initial }: { slug: string; initial: GiftData }) {
  const [mode, setMode] = useState(initial.mode === "none" ? "both" : initial.mode);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [visibility, setVisibility] = useState(initial.visibility);
  const [message, setMessage] = useState(initial.message);
  const [registries, setRegistries] = useState<Registry[]>(initial.registries.length ? initial.registries : []);
  const [cash, setCash] = useState<CashMethod[]>(initial.cashMethods);

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
