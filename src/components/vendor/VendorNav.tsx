"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Vendor portal navigation. Sections not yet built (Phase 2+) render as disabled
// "soon" so the roadmap is visible without faking functionality.
const LIVE = [
  { label: "Overview", href: "/vendors/dashboard" },
  { label: "Profile", href: "/vendors/dashboard/profile" },
  { label: "Compliance", href: "/vendors/dashboard/compliance" },
];
const SOON = ["Bookings", "Assignments", "Calendar", "Messages", "Reviews", "Badges", "Membership", "Payments"];

export default function VendorNav() {
  const pathname = usePathname();
  return (
    <nav className="acct__nav" aria-label="Vendor portal sections">
      {LIVE.map((s) => (
        <Link key={s.href} href={s.href} className={pathname === s.href ? "is-active" : undefined}>{s.label}</Link>
      ))}
      {SOON.map((s) => (
        <span key={s} style={{ padding: "0.6rem 0.85rem", color: "#b3acbd", fontSize: "0.9rem" }}>{s} <span className="chip chip--muted" style={{ fontSize: "0.62rem" }}>soon</span></span>
      ))}
    </nav>
  );
}
