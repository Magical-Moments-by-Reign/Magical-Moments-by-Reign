import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import { adminLogoutAction } from "../actions";
import "../../auth.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Access denied", robots: { index: false } };

const REASONS: Record<string, string> = {
  not_admin: "This account doesn't have admin access.",
  capability: "Your role doesn't include permission for that area.",
  inactive: "This account is inactive or under review.",
  unverified: "Please verify your email before accessing admin.",
};

export default async function AdminDeniedPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const sp = await searchParams;
  const reason = (sp.reason && REASONS[sp.reason]) || "You don't have permission to view that area.";

  return (
    <AuthShell>
      <div className="auth-card auth-result">
        <div className="auth-result__icon">🔒</div>
        <h1>Access denied</h1>
        <p className="auth-lede">{reason} If you believe this is a mistake, please contact an Owner administrator.</p>
        <div style={{ display: "grid", gap: "0.6rem", maxWidth: 280, margin: "0 auto" }}>
          <Link href="/" className="auth-btn auth-btn--ghost" style={{ textAlign: "center", textDecoration: "none" }}>Return to site</Link>
          <form action={adminLogoutAction}><button type="submit" className="auth-btn auth-btn--danger" style={{ width: "100%" }}>Sign out</button></form>
        </div>
      </div>
    </AuthShell>
  );
}
