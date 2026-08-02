import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "You're offline" };

export default function OfflinePage() {
  return (
    <main style={{ minHeight: "70vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "2rem", fontFamily: "var(--font-body)", color: "var(--ink, #2a2130)" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", marginBottom: "0.5rem" }}>You&apos;re offline</h1>
      <p style={{ color: "var(--muted, #6f6577)", maxWidth: "32rem", lineHeight: 1.6 }}>
        Your family&apos;s memories are safe. Reconnect to the internet and your Journeys,
        Family Vault, and everything else will be right where you left them.
      </p>
      <Link href="/dashboard" style={{ marginTop: "1.5rem", color: "var(--gold-deep, #a9843f)", fontWeight: 600 }}>Try again →</Link>
    </main>
  );
}
