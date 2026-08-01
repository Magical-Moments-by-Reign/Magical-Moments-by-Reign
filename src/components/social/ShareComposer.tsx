"use client";

// ── Share composer ──────────────────────────────────────────────
// The full, human-in-the-loop share workflow:
//   1. Update      → what's being shared (+ baby-journey milestones
//                    and the two separate approval questions)
//   2. Platforms   → only the customer's CONNECTED accounts
//   3. Compose     → Ask Magical prepares per-platform versions to edit
//   4. Review      → final review + explicit authorization
//   5. Results     → truthful per-platform status + fallback actions
// Nothing is ever posted without the authorization in step 4.

import { useMemo, useState } from "react";
import Link from "next/link";
import { PLATFORMS, getPlatform, type PlatformId } from "@/lib/social/platforms";
import { PREGNANCY_MILESTONES, isBabyJourney } from "@/lib/social/pregnancy";
import AiVideoNotice from "@/components/social/AiVideoNotice";

interface Connected {
  platform: PlatformId;
  profileName: string;
}
interface ExpOption {
  id: string;
  slug: string;
  title: string;
  type: string;
  url: string;
  cover: string;
  gallery: string[];
}
interface EditableTarget {
  platform: PlatformId;
  format: string;
  title: string;
  visibility: string;
  variant: "suggested" | "short" | "long" | "custom";
  captions: { suggested: string; short: string; long: string };
  caption: string;
  hashtags: string[];
  cover: string;
  cta: string;
  link: string;
  aiNoticeRequired: boolean;
}
interface TargetResult {
  platform: PlatformId;
  status: string;
  postUrl?: string;
  message: string;
  actions: string[];
  fallback: boolean;
}

const EMOJIS = ["✨", "💛", "🌟", "🎉", "💫", "🥹", "👑", "🩷"];
const SOURCE_TYPES = ["update", "photo", "gallery", "announcement", "video"];

export default function ShareComposer({
  connected,
  experiences,
}: {
  connected: Connected[];
  experiences: ExpOption[];
}) {
  const [step, setStep] = useState(1);
  const [expId, setExpId] = useState(experiences[0]?.id ?? "");
  const [sourceType, setSourceType] = useState("update");
  const [sourceLabel, setSourceLabel] = useState("A new update");
  const [aiGenerated, setAiGenerated] = useState(false);
  const [notifyFollowers, setNotifyFollowers] = useState(true);
  const [selected, setSelected] = useState<Set<PlatformId>>(new Set());
  const [targets, setTargets] = useState<EditableTarget[]>([]);
  const [authorized, setAuthorized] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduleAt, setScheduleAt] = useState("");
  const [results, setResults] = useState<TargetResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const experience = useMemo(
    () => experiences.find((e) => e.id === expId),
    [experiences, expId],
  );
  const isBaby = experience ? isBabyJourney(experience.type) : false;
  const connectedIds = connected.map((c) => c.platform);

  function toggle(pid: PlatformId) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(pid)) n.delete(pid);
      else n.add(pid);
      return n;
    });
  }
  function selectAll() {
    setSelected(new Set(connectedIds));
  }

  async function generate() {
    if (!experience || selected.size === 0) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/social/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experienceTitle: experience.title,
          experienceType: experience.type,
          experienceUrl: experience.url,
          sourceType,
          sourceLabel,
          aiGenerated,
          platforms: [...selected],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not prepare content.");
      const editable: EditableTarget[] = data.content.map(
        (c: {
          platform: PlatformId;
          format: string;
          title: string;
          captionSuggested: string;
          captionShort: string;
          captionLong: string;
          hashtags: string[];
          cta: string;
          link: string;
          visibility: string;
          aiNoticeRequired: boolean;
        }) => ({
          platform: c.platform,
          format: c.format,
          title: c.title,
          visibility: c.visibility,
          variant: "suggested",
          captions: {
            suggested: c.captionSuggested,
            short: c.captionShort,
            long: c.captionLong,
          },
          caption: c.captionSuggested,
          hashtags: c.hashtags,
          cover: experience.cover,
          cta: c.cta,
          link: c.link,
          aiNoticeRequired: c.aiNoticeRequired,
        }),
      );
      setTargets(editable);
      setStep(3);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function updateTarget(pid: PlatformId, patch: Partial<EditableTarget>) {
    setTargets((ts) => ts.map((t) => (t.platform === pid ? { ...t, ...patch } : t)));
  }
  function setVariant(pid: PlatformId, variant: EditableTarget["variant"]) {
    setTargets((ts) =>
      ts.map((t) =>
        t.platform === pid
          ? { ...t, variant, caption: variant === "custom" ? t.caption : t.captions[variant] }
          : t,
      ),
    );
  }
  function removeTarget(pid: PlatformId) {
    setTargets((ts) => ts.filter((t) => t.platform !== pid));
    setSelected((s) => {
      const n = new Set(s);
      n.delete(pid);
      return n;
    });
  }

  async function publish() {
    if (!authorized || targets.length === 0) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorized: true,
          experienceId: expId,
          sourceType,
          sourceLabel,
          aiGenerated,
          linkUrl: experience?.url,
          targets: targets.map((t) => ({
            platform: t.platform,
            format: t.format,
            caption: t.caption,
            hashtags: t.hashtags,
            title: t.title,
            visibility: t.visibility,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Publishing failed.");
      setResults(data.results);
      setStep(5);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // ── No connected accounts ──
  if (connected.length === 0 && step < 5) {
    return (
      <div className="sc-empty">
        <h3>Connect an account to begin</h3>
        <p>You haven&apos;t connected any social accounts yet. Connect one to start sharing.</p>
        <Link href="/dashboard/social" className="btn-gold">
          Connect an account
        </Link>
      </div>
    );
  }

  return (
    <div className="sc">
      <Steps step={step} />
      {error && <div className="sc-error">{error}</div>}

      {/* ── Step 1: the update ── */}
      {step === 1 && (
        <div className="sc-card">
          <h3 className="sc-h3">What are you sharing?</h3>

          <label className="sc-label">Experience</label>
          <select className="sc-input" value={expId} onChange={(e) => setExpId(e.target.value)}>
            {experiences.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title} — /{e.slug}
              </option>
            ))}
          </select>

          <label className="sc-label">This update is a…</label>
          <div className="sc-chips">
            {SOURCE_TYPES.map((s) => (
              <button
                key={s}
                type="button"
                className={`sc-chip${sourceType === s ? " is-on" : ""}`}
                onClick={() => setSourceType(s)}
              >
                {s}
              </button>
            ))}
          </div>

          {isBaby && (
            <>
              <label className="sc-label">Baby-journey milestone (optional)</label>
              <div className="sc-chips">
                {PREGNANCY_MILESTONES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`sc-chip${sourceLabel === m.shareLabel ? " is-on" : ""}`}
                    onClick={() => {
                      setSourceLabel(m.shareLabel);
                      setSourceType("milestone");
                    }}
                  >
                    {m.emoji} {m.label}
                  </button>
                ))}
              </div>
            </>
          )}

          <label className="sc-label">Describe it</label>
          <input
            className="sc-input"
            value={sourceLabel}
            onChange={(e) => setSourceLabel(e.target.value)}
            placeholder="e.g. Our new gallery is live!"
          />

          <label className="sc-check">
            <input type="checkbox" checked={aiGenerated} onChange={(e) => setAiGenerated(e.target.checked)} />
            <span>This update includes AI-generated or AI-enhanced video</span>
          </label>
          {aiGenerated && <AiVideoNotice />}

          {isBaby && (
            <div className="sc-baby">
              <p className="sc-baby__q">Would you like to notify your Magical Moment followers?</p>
              <div className="sc-toggle-row">
                <button type="button" className={`sc-toggle${notifyFollowers ? " is-on" : ""}`} onClick={() => setNotifyFollowers(true)}>Yes, notify followers</button>
                <button type="button" className={`sc-toggle${!notifyFollowers ? " is-on" : ""}`} onClick={() => setNotifyFollowers(false)}>Not now</button>
              </div>
              <p className="sc-note">Followers are notified only after you approve — never automatically.</p>
            </div>
          )}

          <div className="sc-actions">
            <Link href="/dashboard/social" className="sc-btn">Cancel</Link>
            <button type="button" className="btn-gold" onClick={() => setStep(2)}>
              Yes, share this update →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: platforms ── */}
      {step === 2 && (
        <div className="sc-card">
          <h3 className="sc-h3">Where would you like to share this magical update?</h3>
          <p className="sc-note">Only your connected accounts are shown.</p>
          <div className="sc-platforms">
            {PLATFORMS.filter((p) => connectedIds.includes(p.id)).map((p) => (
              <label key={p.id} className={`sc-plat${selected.has(p.id) ? " is-on" : ""}`}>
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                <span className="sc-plat__badge" style={{ background: p.brand }}>{p.label[0]}</span>
                <span className="sc-plat__label">{p.label}</span>
              </label>
            ))}
          </div>
          <div className="sc-platforms__foot">
            <button type="button" className="sc-btn" onClick={selectAll}>Share to all connected accounts</button>
            <Link href="/dashboard/social" className="sc-link">+ Connect another account</Link>
          </div>
          <div className="sc-actions">
            <button type="button" className="sc-btn" onClick={() => setStep(1)}>← Back</button>
            <button type="button" className="btn-gold" disabled={selected.size === 0 || busy} onClick={generate}>
              {busy ? "Preparing…" : "Ask Magical to prepare →"}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: compose per platform ── */}
      {step === 3 && (
        <div>
          <p className="sc-note sc-note--lead">
            Ask Magical prepared a version for each platform. Edit anything —
            nothing is sent until you approve it.
          </p>
          <div className="sc-compose">
            {targets.map((t) => {
              const p = getPlatform(t.platform)!;
              return (
                <div key={t.platform} className="sc-tcard">
                  <div className="sc-tcard__head" style={{ borderColor: p.brand }}>
                    <span className="sc-plat__badge" style={{ background: p.brand }}>{p.label[0]}</span>
                    <b>{p.label}</b>
                    <button type="button" className="sc-x" onClick={() => removeTarget(t.platform)} title="Remove this platform">✕</button>
                  </div>

                  <label className="sc-label">Format</label>
                  <select className="sc-input" value={t.format} onChange={(e) => updateTarget(t.platform, { format: e.target.value })}>
                    {p.formats.map((f) => (
                      <option key={f.id} value={f.id}>{f.label} ({f.aspect})</option>
                    ))}
                  </select>

                  {t.platform === "youtube" && (
                    <>
                      <label className="sc-label">Title</label>
                      <input className="sc-input" value={t.title} onChange={(e) => updateTarget(t.platform, { title: e.target.value })} />
                      <label className="sc-label">Visibility</label>
                      <select className="sc-input" value={t.visibility} onChange={(e) => updateTarget(t.platform, { visibility: e.target.value })}>
                        <option value="public">Public</option>
                        <option value="unlisted">Unlisted</option>
                        <option value="private">Private</option>
                      </select>
                    </>
                  )}

                  <label className="sc-label">Caption</label>
                  <div className="sc-variants">
                    {(["suggested", "short", "long"] as const).map((v) => (
                      <button key={v} type="button" className={`sc-vtab${t.variant === v ? " is-on" : ""}`} onClick={() => setVariant(t.platform, v)}>{v}</button>
                    ))}
                  </div>
                  <textarea
                    className="sc-input sc-textarea"
                    rows={4}
                    value={t.caption}
                    onChange={(e) => updateTarget(t.platform, { caption: e.target.value, variant: "custom" })}
                  />
                  <div className="sc-tools">
                    <button type="button" className="sc-btn sc-btn--sm" onClick={() => setVariant(t.platform, "suggested")}>↻ Regenerate</button>
                    {EMOJIS.slice(0, 4).map((em) => (
                      <button key={em} type="button" className="sc-emoji" onClick={() => updateTarget(t.platform, { caption: t.caption + " " + em, variant: "custom" })}>{em}</button>
                    ))}
                  </div>

                  <label className="sc-label">Hashtags</label>
                  <div className="sc-tags">
                    {t.hashtags.map((h) => (
                      <button key={h} type="button" className="sc-tag" onClick={() => updateTarget(t.platform, { hashtags: t.hashtags.filter((x) => x !== h) })} title="Remove">#{h} ✕</button>
                    ))}
                    {t.hashtags.length === 0 && <span className="sc-note">No hashtags</span>}
                  </div>

                  <label className="sc-label">Cover / media</label>
                  <div className="sc-covers">
                    {(experience?.gallery ?? []).map((g) => (
                      <button
                        key={g}
                        type="button"
                        className={`sc-cover${t.cover === g ? " is-on" : ""}`}
                        onClick={() => updateTarget(t.platform, { cover: g })}
                        style={{ backgroundImage: `url(${g})` }}
                        aria-label="Choose this image"
                      />
                    ))}
                  </div>
                  <p className="sc-note">CTA: {t.cta}</p>
                  {t.aiNoticeRequired && (p.formats.find((f) => f.id === t.format)?.kind === "video") && <AiVideoNotice />}
                </div>
              );
            })}
          </div>
          <div className="sc-actions">
            <button type="button" className="sc-btn" onClick={() => setStep(2)}>← Back</button>
            <button type="button" className="btn-gold" disabled={targets.length === 0} onClick={() => setStep(4)}>Review →</button>
          </div>
        </div>
      )}

      {/* ── Step 4: review & authorize ── */}
      {step === 4 && (
        <div className="sc-card">
          <h3 className="sc-h3">Final review</h3>
          <p className="sc-note">Please review each platform version before authorizing.</p>

          <div className="sc-review">
            {targets.map((t) => {
              const acc = connected.find((c) => c.platform === t.platform);
              const p = getPlatform(t.platform)!;
              return (
                <div key={t.platform} className="sc-rrow">
                  <div className="sc-rrow__head">
                    <span className="sc-plat__badge" style={{ background: p.brand }}>{p.label[0]}</span>
                    <b>{p.label}</b>
                    <span className="sc-rrow__acct">{acc?.profileName}</span>
                    <span className="sc-rrow__fmt">{p.formats.find((f) => f.id === t.format)?.label}</span>
                  </div>
                  {t.platform === "youtube" && <p className="sc-rrow__title">Title: {t.title} · {t.visibility}</p>}
                  <p className="sc-rrow__cap">{t.caption}</p>
                  {t.hashtags.length > 0 && <p className="sc-rrow__tags">{t.hashtags.map((h) => "#" + h).join(" ")}</p>}
                  <p className="sc-rrow__link">Link: {t.link}</p>
                  {t.aiNoticeRequired && <AiVideoNotice />}
                </div>
              );
            })}
          </div>

          <div className="sc-schedule">
            <label className="sc-label">When</label>
            <div className="sc-toggle-row">
              <button type="button" className={`sc-toggle${scheduleMode === "now" ? " is-on" : ""}`} onClick={() => setScheduleMode("now")}>Publish now</button>
              <button type="button" className={`sc-toggle${scheduleMode === "later" ? " is-on" : ""}`} onClick={() => setScheduleMode("later")}>Schedule</button>
            </div>
            {scheduleMode === "later" && (
              <input type="datetime-local" className="sc-input" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
            )}
          </div>

          {aiGenerated && (
            <p className="sc-disclosure">This share includes AI-generated or AI-enhanced content, which will be disclosed where required.</p>
          )}

          <label className="sc-ack">
            <input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} />
            <span>
              I have reviewed this content and authorize Magical Moments by Reign
              to send it to the selected social-media accounts.
            </span>
          </label>

          <div className="sc-actions">
            <button type="button" className="sc-btn" onClick={() => setStep(3)}>← Back</button>
            <button type="button" className="btn-gold" disabled={!authorized || busy} onClick={publish}>
              {busy ? "Sending…" : "Approve & Share"}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 5: results ── */}
      {step === 5 && results && (
        <div className="sc-card">
          <h3 className="sc-h3">Share results</h3>
          <p className="sc-note">Each platform is reported honestly — a draft or prepared post is never shown as published.</p>
          <div className="sc-results">
            {results.map((r) => {
              const p = getPlatform(r.platform)!;
              return (
                <div key={r.platform} className={`sc-result sc-result--${r.status.toLowerCase()}`}>
                  <div className="sc-result__head">
                    <span className="sc-plat__badge" style={{ background: p.brand }}>{p.label[0]}</span>
                    <b>{p.label}</b>
                    <span className="sc-result__status">{statusLabel(r.status)}</span>
                  </div>
                  <p className="sc-result__msg">{r.message}</p>
                  <div className="sc-result__actions">
                    {r.actions.includes("view") && r.postUrl && (
                      <a className="sc-btn sc-btn--sm" href={r.postUrl} target="_blank" rel="noreferrer">View post</a>
                    )}
                    {r.actions.includes("copy-link") && r.postUrl && (
                      <CopyButton text={r.postUrl} />
                    )}
                    {r.actions.includes("open-app") && <span className="sc-btn sc-btn--sm">Open {p.label} app</span>}
                    {r.actions.includes("download") && <span className="sc-btn sc-btn--sm">Download media</span>}
                    {r.actions.includes("reconnect") && <Link className="sc-btn sc-btn--sm" href="/dashboard/social">Reconnect account</Link>}
                    {r.actions.includes("retry") && <span className="sc-btn sc-btn--sm">Retry</span>}
                  </div>
                  {r.fallback && <p className="sc-note">One platform&apos;s issue never blocks the others.</p>}
                </div>
              );
            })}
          </div>
          <div className="sc-actions">
            <Link href="/dashboard/social" className="sc-btn">Back to studio</Link>
            <Link href="/dashboard/social/share" className="btn-gold">Share another</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    PUBLISHED: "Published",
    DRAFT: "Sent as Draft",
    PROCESSING: "Processing",
    NEEDS_ACTION: "Needs Customer Action",
    FAILED: "Failed",
    EXPIRED: "Connection Expired",
  };
  return map[s] ?? s;
}

function Steps({ step }: { step: number }) {
  const labels = ["Update", "Platforms", "Compose", "Review", "Results"];
  return (
    <ol className="sc-steps">
      {labels.map((l, i) => (
        <li key={l} className={`sc-step${step === i + 1 ? " is-on" : ""}${step > i + 1 ? " is-done" : ""}`}>
          <span className="sc-step__n">{step > i + 1 ? "✓" : i + 1}</span>
          {l}
        </li>
      ))}
    </ol>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="sc-btn sc-btn--sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          setDone(false);
        }
      }}
    >
      {done ? "Copied!" : "Copy link"}
    </button>
  );
}
