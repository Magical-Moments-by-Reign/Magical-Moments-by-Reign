import { requireAccount } from "@/lib/guard";

export const dynamic = "force-dynamic";

// Server-side enforcement for the whole dashboard. The middleware redirects
// unauthenticated visitors (preserving ?next=); this re-validates the session
// against the database. Account is the canonical identity — no demo login.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireAccount("/dashboard");
  return <>{children}</>;
}
