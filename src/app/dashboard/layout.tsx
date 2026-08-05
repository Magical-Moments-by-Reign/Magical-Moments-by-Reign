import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { unreadCount } from "@/lib/notify";
import DashboardChrome from "@/components/dashboard/DashboardChrome";
import ConciergeChat from "@/components/concierge/ConciergeChat";

export const dynamic = "force-dynamic";

// Server-side enforcement for the whole dashboard. The middleware redirects
// unauthenticated visitors (preserving ?next=); this re-validates the session
// against the database. Account is the canonical identity — no demo login.
// Renders the shared chrome (sidebar/topbar/mobile drawer) once, so every
// /dashboard/* page gets working navigation and the Concierge, everywhere.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const account = await requireAccount("/dashboard");

  const [unread, row] = await Promise.all([
    unreadCount(account.id).catch(() => 0),
    prisma.account.findUnique({ where: { id: account.id }, select: { staffRoles: true } }),
  ]);
  let isOwner = false;
  try { isOwner = (JSON.parse(row?.staffRoles || "[]") as unknown[]).includes("owner"); } catch { isOwner = false; }

  const initial = (account.firstName?.[0] ?? "M").toUpperCase();

  return (
    <>
      <DashboardChrome initial={initial} unread={unread} isOwner={isOwner}>
        {children}
      </DashboardChrome>
      <ConciergeChat />
    </>
  );
}
