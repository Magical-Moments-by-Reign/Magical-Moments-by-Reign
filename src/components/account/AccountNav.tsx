"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Left-hand navigation for the account dashboard. Every section the platform
// foundation activates is listed here; some share a page via anchors.
const SECTIONS: { label: string; href: string; match: string }[] = [
  { label: "Profile", href: "/account", match: "/account" },
  { label: "Family", href: "/account/family", match: "/account/family" },
  { label: "Children & Teens", href: "/account/family#children", match: "/account/family" },
  { label: "Permissions", href: "/account/family#permissions", match: "/account/family" },
  { label: "Invitations", href: "/account/family#invitations", match: "/account/family" },
  { label: "Notifications", href: "/account/notifications", match: "/account/notifications" },
  { label: "Membership & Billing", href: "/account/billing", match: "/account/billing" },
  { label: "Security", href: "/account/security", match: "/account/security" },
  { label: "Active Sessions", href: "/account/security#sessions", match: "/account/security" },
  { label: "Privacy", href: "/account/security#privacy", match: "/account/security" },
  { label: "Connected Accounts", href: "/account/security#connected", match: "/account/security" },
];

export default function AccountNav() {
  const pathname = usePathname();
  return (
    <nav className="acct__nav" aria-label="Account sections">
      {SECTIONS.map((s) => (
        <Link key={s.label} href={s.href} className={pathname === s.match ? "is-active" : undefined}>
          {s.label}
        </Link>
      ))}
    </nav>
  );
}
