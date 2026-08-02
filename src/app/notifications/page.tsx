import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { NOTIFICATION_TYPES, notificationType, type NotificationType } from "@/lib/notifications";
import { logoutAction } from "../account/actions";
import { markReadAction, markAllReadAction, archiveAction } from "./actions";
import "../auth.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Notifications", robots: { index: false } };

// Filter categories (the 7 domain categories + all/unread/archived views).
const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "celebration", label: "Celebrations" },
  { id: "organization", label: "Reminders & tasks" },
  { id: "education", label: "Education" },
  { id: "family", label: "Family" },
  { id: "vendor", label: "Vendor" },
  { id: "billing", label: "Billing" },
  { id: "system", label: "System" },
  { id: "archived", label: "Archived" },
];

function timeAgo(d: Date): string {
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const acct = await requireAccount("/notifications");
  const sp = await searchParams;
  const filter = CATEGORIES.some((c) => c.id === sp.filter) ? sp.filter! : "all";

  // Build the where clause from the active filter.
  const where: {
    accountId: string; archivedAt?: null | { not: null }; readAt?: null; type?: { in: NotificationType[] };
  } = { accountId: acct.id, archivedAt: null };
  if (filter === "archived") where.archivedAt = { not: null };
  else if (filter === "unread") where.readAt = null;
  else if (filter !== "all") {
    where.type = { in: NOTIFICATION_TYPES.filter((t) => t.category === filter).map((t) => t.id) };
  }

  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where, orderBy: { createdAt: "desc" }, take: 100,
      select: { id: true, type: true, title: true, body: true, actionUrl: true, relatedLabel: true, readAt: true, createdAt: true },
    }),
    prisma.notification.count({ where: { accountId: acct.id, readAt: null, archivedAt: null } }),
  ]);

  return (
    <div className="acct">
      <header className="acct__bar">
        <Link href="/account" className="acct__bar-brand" aria-label="Back to account">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-mark.png" alt="" width={34} height={34} />
          <span>Magical Moments</span>
        </Link>
        <div className="acct__bar-right">
          <Link href="/account" style={{ fontSize: "0.9rem" }}>Account</Link>
          <form action={logoutAction}>
            <button type="submit" style={{ background: "none", border: "1px solid rgba(246,239,226,0.4)", color: "#f6efe2", borderRadius: 999, padding: "0.4rem 0.9rem", cursor: "pointer", fontSize: "0.85rem" }}>Sign out</button>
          </form>
        </div>
      </header>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "1.6rem 1.2rem 4rem" }}>
        <div className="acct__panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.6rem" }}>
            <h1>Notifications {unread > 0 && <span className="chip chip--warn" style={{ verticalAlign: "middle" }}>{unread} unread</span>}</h1>
            {unread > 0 && (
              <form action={markAllReadAction}>
                <input type="hidden" name="filter" value={filter} />
                <button type="submit" className="auth-btn auth-btn--ghost" style={{ width: "auto", padding: "0.45rem 1rem", fontSize: "0.85rem" }}>Mark all read</button>
              </form>
            )}
          </div>
          <p>Your in-app inbox is the source of truth — everything lands here, even when email or SMS aren't set up.</p>

          <div className="ntf-filters">
            {CATEGORIES.map((c) => (
              <Link key={c.id} href={`/notifications?filter=${c.id}`} className={filter === c.id ? "is-active" : undefined}>{c.label}</Link>
            ))}
          </div>

          {items.length === 0 ? (
            <div className="ntf-empty">
              <div style={{ fontSize: "2rem" }}>🔔</div>
              <p>You're all caught up. New notifications will appear here.</p>
            </div>
          ) : (
            <ul className="ntf-list">
              {items.map((n) => {
                const def = notificationType(n.type as NotificationType);
                const unreadItem = !n.readAt && filter !== "archived";
                return (
                  <li key={n.id} className={`ntf-item ${unreadItem ? "ntf-item--unread" : ""}`}>
                    <span className={`ntf-dot ${unreadItem ? "" : "ntf-dot--read"}`} aria-hidden="true" />
                    <div className="ntf-body">
                      <div className="ntf-title">{n.title}</div>
                      <p className="ntf-text">{n.body}</p>
                      <div className="ntf-meta">
                        {def && <span className="chip chip--muted">{def.label}</span>}
                        {n.relatedLabel && <span>· {n.relatedLabel}</span>}
                        <span>· {timeAgo(n.createdAt)}</span>
                      </div>
                      <div className="ntf-actions" style={{ marginTop: "0.4rem" }}>
                        {n.actionUrl && <Link href={n.actionUrl}>View</Link>}
                        {unreadItem && (
                          <form action={markReadAction} style={{ display: "inline" }}>
                            <input type="hidden" name="id" value={n.id} />
                            <input type="hidden" name="filter" value={filter} />
                            <button type="submit">Mark read</button>
                          </form>
                        )}
                        {filter !== "archived" && (
                          <form action={archiveAction} style={{ display: "inline" }}>
                            <input type="hidden" name="id" value={n.id} />
                            <input type="hidden" name="filter" value={filter} />
                            <button type="submit">Archive</button>
                          </form>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
