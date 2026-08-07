"use client";

// ── Journey Studio review panel ─────────────────────────────────
// The Creative Director, surfaced in the builder. Shows honest provenance
// (real AI vs deterministic curation), the suggestions grouped by what they
// change, and lets the member Apply Selected / Apply All — every apply is
// reversible (Undo) and recorded in an in-session history.

import { useMemo, useState } from "react";
import Link from "next/link";
import { runReview, applyStudio, revertStudio, type StudioReviewResult, type StudioSnapshot } from "./actions";
import type { StudioApplyKind } from "@/lib/journey/studio-apply";
import "./studio.css";

interface AssetLite { id: string; url: string; kind: string; caption?: string | null }

interface HistoryEntry { id: number; applied: StudioApplyKind[]; previous: StudioSnapshot; at: string; undone?: boolean }

const KIND_LABEL: Record<StudioApplyKind, string> = {
  cover: "Cover photo",
  gallery: "Gallery order",
  timeline: "Timeline",
  sections: "Layout & sections",
};

export default function StudioReview({
  slug, initial, assets,
}: {
  slug: string;
  initial: StudioReviewResult;
  assets: AssetLite[];
}) {
  const [result, setResult] = useState<StudioReviewResult>(initial);
  const [selected, setSelected] = useState<Set<StudioApplyKind>>(new Set());
  const [busy, setBusy] = useState<null | "review" | "apply" | "undo">(null);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const rec = result.recommendation;
  const available = result.available ?? [];
  const assetById = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets]);

  function toggle(kind: StudioApplyKind) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind); else next.add(kind);
      return next;
    });
  }

  async function reRun() {
    setBusy("review"); setError(""); setFlash("");
    try {
      const r = await runReview(slug);
      if (!r.ok) { setError(r.error || "Journey Studio is unavailable right now."); return; }
      setResult(r); setSelected(new Set());
    } finally { setBusy(null); }
  }

  async function apply(kinds: StudioApplyKind[]) {
    if (!kinds.length) { setError("Select at least one suggestion to apply."); return; }
    setBusy("apply"); setError(""); setFlash("");
    try {
      const r = await applyStudio(slug, kinds);
      if (!r.ok || !r.previous) { setError(r.error || "Nothing was changed."); return; }
      setHistory((h) => [
        { id: h.length ? h[0].id + 1 : 1, applied: r.applied ?? kinds, previous: r.previous!, at: new Date().toLocaleTimeString() },
        ...h,
      ]);
      setSelected(new Set());
      setFlash(`Applied: ${(r.applied ?? kinds).map((k) => KIND_LABEL[k]).join(", ")}. You can undo this below.`);
    } finally { setBusy(null); }
  }

  async function undo(entry: HistoryEntry) {
    setBusy("undo"); setError(""); setFlash("");
    try {
      const r = await revertStudio(slug, entry.previous);
      if (!r.ok) { setError(r.error || "We couldn't undo that."); return; }
      setHistory((h) => h.map((e) => (e.id === entry.id ? { ...e, undone: true } : e)));
      setFlash(`Reverted: ${entry.applied.map((k) => KIND_LABEL[k]).join(", ")}.`);
    } finally { setBusy(null); }
  }

  const isAI = rec?.source === "openai";
  const coverAsset = rec?.coverSuggestion ? assetById.get(rec.coverSuggestion.mediaId) : undefined;
  const why = rec?.rationale;

  return (
    <div className="jst">
      <header className="jst-head">
        <div>
          <span className="jst-eyebrow">Journey Studio ✦</span>
          <h1 className="jst-title">Creative direction for this occasion</h1>
        </div>
        <span className={`jst-badge ${isAI ? "is-ai" : "is-heur"}`}>
          {isAI ? "AI Creative Director" : "Smart curation"}
        </span>
      </header>

      {!result.aiConfigured && (
        <p className="jst-note-key">
          Suggestions below are deterministic curation. Add an <code>OPENAI_API_KEY</code> in the
          server environment to upgrade Journey Studio to live AI direction — the panel works either way.
        </p>
      )}

      {error && <div className="jst-error">{error}</div>}
      {flash && <div className="jst-flash">{flash}</div>}

      {!rec ? (
        <div className="jst-empty">
          <p>{result.error || "Journey Studio has no suggestions yet."}</p>
          <button className="btn-gold" onClick={reRun} disabled={busy !== null}>Try again</button>
        </div>
      ) : (
        <>
          {rec.summary && <p className="jst-summary">{rec.summary}</p>}

          {available.length === 0 ? (
            <div className="jst-empty">
              <p>Add a few photos to this occasion and Journey Studio will suggest a cover, a gallery order, a timeline, and the best section layout.</p>
              <Link href={`/dashboard/${slug}/media`} className="btn-gold">Upload media</Link>
            </div>
          ) : (
            <>
              <div className="jst-actions">
                <button className="btn-gold" disabled={busy !== null || selected.size === 0} onClick={() => apply([...selected])}>
                  {busy === "apply" ? "Applying…" : `Apply Selected (${selected.size})`}
                </button>
                <button className="btn btn-dark" disabled={busy !== null} onClick={() => apply(available)}>Apply All</button>
                <button className="jst-rerun" disabled={busy !== null} onClick={reRun}>{busy === "review" ? "Refreshing…" : "Re-run"}</button>
              </div>

              <div className="jst-cards">
                {available.includes("cover") && (
                  <label className="jst-card">
                    <input type="checkbox" checked={selected.has("cover")} onChange={() => toggle("cover")} />
                    <div className="jst-card__body">
                      <span className="jst-card__t">Cover photo</span>
                      {coverAsset && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="jst-thumb" src={coverAsset.url} alt="Suggested cover" />
                      )}
                      <span className="jst-why">{why?.cover || rec.coverSuggestion?.reason || "The strongest image to lead the page."}</span>
                    </div>
                  </label>
                )}

                {available.includes("gallery") && (
                  <label className="jst-card">
                    <input type="checkbox" checked={selected.has("gallery")} onChange={() => toggle("gallery")} />
                    <div className="jst-card__body">
                      <span className="jst-card__t">Gallery order</span>
                      <span className="jst-card__s">Arranges your {rec.galleryOrder?.length ?? 0} uploaded photo(s), cover first.</span>
                      <span className="jst-why">{why?.gallery || "A smooth, curated flow for your gallery."}</span>
                    </div>
                  </label>
                )}

                {available.includes("timeline") && (
                  <label className="jst-card">
                    <input type="checkbox" checked={selected.has("timeline")} onChange={() => toggle("timeline")} />
                    <div className="jst-card__body">
                      <span className="jst-card__t">Timeline</span>
                      <ul className="jst-list">
                        {(rec.timeline ?? []).slice(0, 5).map((m, i) => (
                          <li key={i}>{m.date ? <b>{m.date}</b> : null} {m.title}</li>
                        ))}
                      </ul>
                      {why?.timeline && <span className="jst-why">{why.timeline}</span>}
                    </div>
                  </label>
                )}

                {available.includes("sections") && (
                  <label className="jst-card">
                    <input type="checkbox" checked={selected.has("sections")} onChange={() => toggle("sections")} />
                    <div className="jst-card__body">
                      <span className="jst-card__t">Layout & sections</span>
                      {(rec.layout?.sectionOrder?.length ?? 0) > 0 && (
                        <div className="jst-chips">
                          {rec.layout!.sectionOrder.map((s) => <span key={s} className="jst-chip">{s}</span>)}
                        </div>
                      )}
                      {(rec.missingSections?.length ?? 0) > 0 && (
                        <span className="jst-card__s">Adds: {rec.missingSections!.join(", ")}</span>
                      )}
                      {why?.layout && <span className="jst-why">{why.layout}</span>}
                    </div>
                  </label>
                )}
              </div>

              {(rec.memoryIdeas?.length ?? 0) > 0 && (
                <div className="jst-advisory jst-memories">
                  <span className="jst-card__t">Missing Memories</span>
                  <span className="jst-card__s">{why?.missing || "If these memories exist, they could make your story even richer."}</span>
                  <ul className="jst-memlist">
                    {rec.memoryIdeas!.map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                </div>
              )}

              {(rec.duplicates?.length ?? 0) > 0 && (
                <div className="jst-advisory">
                  <span className="jst-card__t">Possible duplicate uploads</span>
                  <ul className="jst-list">
                    {rec.duplicates!.slice(0, 4).map((d, i) => (
                      <li key={i}>{d.mediaIds.length} similar photo(s){d.reason ? ` — ${d.reason}` : ""}</li>
                    ))}
                  </ul>
                  <span className="jst-card__s">Review these on your <Link href={`/dashboard/${slug}/media`}>media page</Link>. Journey Studio never deletes anything for you.</span>
                </div>
              )}

              {(rec.notes?.length ?? 0) > 0 && (
                <ul className="jst-notes">
                  {rec.notes.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              )}
            </>
          )}
        </>
      )}

      {rec?.reflection && (
        <figure className="jst-reflection">
          <span className="jst-reflection__mark">✦</span>
          <blockquote>{rec.reflection}</blockquote>
          <figcaption>Journey Studio — Creative Reflection</figcaption>
        </figure>
      )}

      {history.length > 0 && (
        <div className="jst-history">
          <h2 className="jst-history__t">History</h2>
          {history.map((e) => (
            <div key={e.id} className={`jst-hrow${e.undone ? " is-undone" : ""}`}>
              <span>{e.at} — {e.applied.map((k) => KIND_LABEL[k]).join(", ")}{e.undone ? " (undone)" : ""}</span>
              {!e.undone && (
                <button className="jst-undo" disabled={busy !== null} onClick={() => undo(e)}>Undo</button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="jst-foot">
        <Link href={`/dashboard/${slug}/media`} className="btn btn-dark">← Back to media</Link>
        <Link href={`/${slug}`} className="jst-preview">Preview occasion →</Link>
      </div>
    </div>
  );
}
