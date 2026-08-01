"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { checkUpload, kindOf, humanSize, planMedia, storageCapGB } from "@/lib/media-limits";
import type { PlanId } from "@/lib/plans";
import { getPlan } from "@/lib/plans";

interface Asset { id: string; url: string; kind: string; bytes: number; caption?: string | null }
interface Usage { photoBytes: number; videoBytes: number }

interface Item {
  key: string;
  name: string;
  kind: "IMAGE" | "VIDEO";
  size: number;
  status: "checking" | "blocked" | "uploading" | "done" | "error";
  progress?: number;
  message?: string;
  suggestedPlan?: PlanId;
  previewUrl?: string;
}

const GB = 1024 * 1024 * 1024;

export default function MediaUploader({
  experienceId,
  planId,
  initialAssets,
  initialUsage,
  storageEnabled,
}: {
  experienceId: string;
  planId: PlanId;
  initialAssets: Asset[];
  initialUsage: Usage;
  storageEnabled: boolean;
}) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [items, setItems] = useState<Item[]>([]);
  const [usage, setUsage] = useState<Usage>(initialUsage);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const m = planMedia(planId);
  const plan = getPlan(planId);

  const update = (key: string, patch: Partial<Item>) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      // Track running usage so multi-file selections respect the cap.
      let runningPhoto = usage.photoBytes;
      let runningVideo = usage.videoBytes;

      for (const file of list) {
        const kind = kindOf(file.type);
        const key = `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`;
        const previewUrl = kind === "IMAGE" ? URL.createObjectURL(file) : undefined;
        setItems((prev) => [{ key, name: file.name, kind, size: file.size, status: "checking", previewUrl }, ...prev]);

        const usedBytes = kind === "VIDEO" ? runningVideo : runningPhoto;
        const check = checkUpload({ planId, mime: file.type, sizeBytes: file.size, usedBytes });
        if (!check.ok) {
          update(key, { status: "blocked", message: check.message, suggestedPlan: check.suggestedPlan });
          continue;
        }

        if (!storageEnabled) {
          update(key, {
            status: "blocked",
            message: "Uploads aren't switched on yet — this file passed your plan's limits. Add storage credentials to finish uploading.",
          });
          continue;
        }

        try {
          update(key, { status: "uploading", progress: 5 });
          const signRes = await fetch("/api/upload/sign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ experienceId, name: file.name, type: file.type, size: file.size }),
          });
          const signed = await signRes.json();
          if (!signRes.ok) {
            update(key, { status: "blocked", message: signed.error, suggestedPlan: signed.suggestedPlan });
            continue;
          }

          await putWithProgress(signed.uploadUrl, file, (pct) => update(key, { progress: pct }));

          const compRes = await fetch("/api/upload/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              experienceId, kind, url: signed.publicUrl, storagePath: signed.path,
              bytes: file.size, mime: file.type,
            }),
          });
          const done = await compRes.json();
          if (!compRes.ok) {
            update(key, { status: "error", message: done.error });
            continue;
          }

          update(key, { status: "done", progress: 100 });
          setAssets((prev) => [{ id: done.id, url: done.url, kind: done.kind, bytes: done.bytes }, ...prev]);
          if (kind === "VIDEO") { runningVideo += file.size; setUsage((u) => ({ ...u, videoBytes: u.videoBytes + file.size })); }
          else { runningPhoto += file.size; setUsage((u) => ({ ...u, photoBytes: u.photoBytes + file.size })); }
        } catch (e) {
          update(key, { status: "error", message: (e as Error).message });
        }
      }
    },
    [experienceId, planId, storageEnabled, usage.photoBytes, usage.videoBytes],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const removeAsset = async (id: string) => {
    const asset = assets.find((a) => a.id === id);
    setAssets((prev) => prev.filter((a) => a.id !== id));
    if (asset) {
      if (asset.kind === "VIDEO") setUsage((u) => ({ ...u, videoBytes: Math.max(0, u.videoBytes - asset.bytes) }));
      else setUsage((u) => ({ ...u, photoBytes: Math.max(0, u.photoBytes - asset.bytes) }));
    }
    await fetch("/api/upload/delete", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    }).catch(() => {});
  };

  const photoCap = storageCapGB(planId, "IMAGE") * GB;
  const videoCap = storageCapGB(planId, "VIDEO") * GB;

  return (
    <div className="mu">
      <div className="mu-plan">
        <span>Your package: <strong>{plan?.name ?? planId}</strong></span>
        <span className="mu-plan__caps">Photos up to {m.maxPhotoMB} MB · Videos up to {m.maxVideoMB} MB each</span>
        <Link href="/pricing" className="mu-plan__upgrade">Upgrade for more →</Link>
      </div>

      <div className="mu-meters">
        <Meter label="Photo storage" used={usage.photoBytes} cap={photoCap} />
        <Meter label="Video storage" used={usage.videoBytes} cap={videoCap} />
      </div>

      <div
        className={`mu-drop${dragOver ? " is-over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <div className="mu-drop__icon" aria-hidden="true">↑</div>
        <p className="mu-drop__title">Drag &amp; drop photos and videos</p>
        <p className="mu-drop__sub">or <span>browse your files</span> — photos &amp; videos both welcome</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {items.length > 0 && (
        <ul className="mu-queue">
          {items.map((it) => (
            <li key={it.key} className={`mu-q mu-q--${it.status}`}>
              <span className="mu-q__thumb" aria-hidden="true">
                {it.previewUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={it.previewUrl} alt="" />
                  : <span className="mu-q__vid">▶</span>}
              </span>
              <div className="mu-q__info">
                <span className="mu-q__name">{it.name}</span>
                <span className="mu-q__meta">{it.kind === "VIDEO" ? "Video" : "Photo"} · {humanSize(it.size)}</span>
                {it.status === "uploading" && (
                  <span className="mu-q__bar"><span style={{ width: `${it.progress ?? 0}%` }} /></span>
                )}
                {it.status === "done" && <span className="mu-q__ok">✓ Uploaded</span>}
                {(it.status === "blocked" || it.status === "error") && (
                  <span className="mu-q__err">
                    {it.message}
                    {it.suggestedPlan && (
                      <Link href="/pricing" className="mu-q__upgrade">Upgrade to {getPlan(it.suggestedPlan)?.name} →</Link>
                    )}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mu-section-title">Your media {assets.length > 0 && <span>({assets.length})</span>}</h3>
      {assets.length === 0 ? (
        <p className="mu-empty">Nothing uploaded yet — add your first photos and videos above.</p>
      ) : (
        <div className="mu-grid">
          {assets.map((a) => (
            <figure className="mu-tile" key={a.id}>
              {a.kind === "VIDEO" ? (
                <video src={a.url} muted playsInline preload="metadata" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.url} alt={a.caption || "Uploaded media"} loading="lazy" />
              )}
              {a.kind === "VIDEO" && <span className="mu-tile__badge" aria-hidden="true">▶</span>}
              <button type="button" className="mu-tile__del" aria-label="Remove" onClick={() => removeAsset(a.id)}>✕</button>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}

function Meter({ label, used, cap }: { label: string; used: number; cap: number }) {
  const pct = Math.min(100, Math.round((used / cap) * 100));
  return (
    <div className="mu-meter">
      <div className="mu-meter__top"><span>{label}</span><span>{humanSize(used)} / {humanSize(cap)}</span></div>
      <div className="mu-meter__bar"><span style={{ width: `${pct}%` }} className={pct >= 90 ? "is-full" : undefined} /></div>
    </div>
  );
}

/** PUT a file to a signed URL with upload progress via XHR. */
function putWithProgress(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("x-upsert", "true");
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 95) + 3); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Upload failed.")));
    xhr.onerror = () => reject(new Error("Upload failed."));
    xhr.send(file);
  });
}
