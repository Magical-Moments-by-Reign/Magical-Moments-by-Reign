"use client";

// Real in-Studio preview: renders the ACTUAL experience page in an iframe at a
// desktop or phone width. It only ever points at demo draft slugs passed from
// the server, so it can't be used to frame arbitrary pages.

import { useState } from "react";

interface Option {
  slug: string;
  title: string;
  exists: boolean;
}

export default function PreviewFrame({ options }: { options: Option[] }) {
  const live = options.filter((o) => o.exists);
  const [slug, setSlug] = useState(live[0]?.slug ?? "");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  if (live.length === 0) {
    return (
      <p className="od-note">
        No demo drafts exist yet — run the provisioning script (see below) to create them, then preview here.
      </p>
    );
  }

  return (
    <div className="od-preview">
      <div className="od-preview__bar">
        <label className="od-preview__pick">
          <span>Preview draft</span>
          <select value={slug} onChange={(e) => setSlug(e.target.value)}>
            {live.map((o) => (
              <option key={o.slug} value={o.slug}>{o.title}</option>
            ))}
          </select>
        </label>
        <div className="od-preview__dev" role="group" aria-label="Preview device">
          <button
            type="button"
            className={device === "desktop" ? "is-on" : ""}
            onClick={() => setDevice("desktop")}
          >
            Desktop
          </button>
          <button
            type="button"
            className={device === "mobile" ? "is-on" : ""}
            onClick={() => setDevice("mobile")}
          >
            Mobile
          </button>
        </div>
        <a className="od-preview__open" href={`/${slug}`} target="_blank" rel="noreferrer">
          Open full page ↗
        </a>
      </div>
      <div className={`od-preview__stage od-preview__stage--${device}`}>
        <iframe
          key={`${slug}-${device}`}
          className="od-preview__frame"
          src={`/${slug}`}
          title="Visitor-view preview"
          loading="lazy"
        />
      </div>
      <p className="od-preview__hint">
        This is the true visitor view of the draft. It stays private (draft) until you publish it.
      </p>
    </div>
  );
}
