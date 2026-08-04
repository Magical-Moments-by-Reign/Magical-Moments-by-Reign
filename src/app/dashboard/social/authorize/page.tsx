import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlatform } from "@/lib/social/platforms";
import { completeSandboxAction } from "../actions";
import "../social.css";

export const metadata = { title: "Authorize connection" };

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string }>;
}) {
  const { platform } = await searchParams;
  const p = platform ? getPlatform(platform) : undefined;
  if (!p) notFound();

  return (
    <div className="ss" style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
      <div style={{ maxWidth: 480, width: "100%", padding: "2rem 1.5rem" }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            border: "1px solid var(--gray-200)",
            boxShadow: "0 30px 60px -40px rgba(43,39,50,0.5)",
            overflow: "hidden",
          }}
        >
          <div style={{ background: p.brand, color: "#fff", padding: "1.4rem 1.6rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 700 }}>{p.label}</div>
            <div style={{ fontSize: "0.8rem", opacity: 0.85 }}>Authorization</div>
          </div>
          <div style={{ padding: "1.6rem" }}>
            <p style={{ fontSize: "0.8rem", color: "#a5641a", background: "rgba(198,161,90,0.12)", border: "1px solid rgba(198,161,90,0.4)", borderRadius: 10, padding: "0.6rem 0.8rem", margin: "0 0 1.2rem" }}>
              <b>Sandbox authorization.</b> In production this is {p.label}&apos;s own
              login &amp; consent screen. You would never type your password into
              Magical Moments — {p.label} authorizes us directly.
            </p>
            <p style={{ fontSize: "0.92rem", color: "#4a4551" }}>
              <strong>Magical Moments by Reign</strong> is requesting permission to:
            </p>
            <ul style={{ fontSize: "0.88rem", color: "#5f5866", paddingLeft: "1.1rem", lineHeight: 1.6 }}>
              <li>See your basic profile / page name</li>
              <li>Publish or upload content you explicitly approve</li>
            </ul>
            <p style={{ fontSize: "0.76rem", color: "#a1917a" }}>
              Scopes: {p.scopes.join(", ")}
            </p>

            <form action={completeSandboxAction} style={{ display: "grid", gap: "0.6rem", marginTop: "1.2rem" }}>
              <input type="hidden" name="platform" value={p.id} />
              <button type="submit" className="btn-gold" style={{ justifyContent: "center" }}>
                Authorize Magical Moments
              </button>
              <Link
                href="/dashboard/social"
                style={{ textAlign: "center", fontSize: "0.85rem", color: "#7a7280" }}
              >
                Cancel
              </Link>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
