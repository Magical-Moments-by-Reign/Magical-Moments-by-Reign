"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export interface NavLink {
  label: string;
  href: string;
  key: string;
}

/** Hamburger menu + slide-in drawer for phone/tablet navigation. */
export default function MobileNav({ links, active }: { links: NavLink[]; active?: string }) {
  const [open, setOpen] = useState(false);

  // Lock body scroll while the drawer is open; close on Escape.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="mnav-toggle"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>

      <div
        className={`mnav-overlay${open ? " is-open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      <aside
        id="mobile-menu"
        className={`mnav-drawer${open ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <div className="mnav-drawer__head">
          <span className="mnav-drawer__brand">
            <span className="mnav-drawer__name">Magical Moments</span>
            <span className="mnav-drawer__sub">by reign</span>
          </span>
          <button
            type="button"
            className="mnav-close"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            ✕
          </button>
        </div>

        <nav className="mnav-links" aria-label="Primary">
          {links.map((l) => (
            <Link
              key={l.key}
              href={l.href}
              className={`mnav-link${active === l.key ? " is-active" : ""}`}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="mnav-actions">
          <Link href="/login" className="btn-outline-gold" onClick={() => setOpen(false)}>
            Log in
          </Link>
          <Link href="/create" className="btn-gold" onClick={() => setOpen(false)}>
            Start your magic ✦
          </Link>
        </div>
      </aside>
    </>
  );
}
