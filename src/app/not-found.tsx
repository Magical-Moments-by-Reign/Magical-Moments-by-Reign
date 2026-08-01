import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "80vh",
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        padding: "3rem 1.5rem",
      }}
    >
      <div>
        <p className="eyebrow">404</p>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", color: "var(--plum-800)" }}>
          We couldn&apos;t find that page
        </h1>
        <p className="muted" style={{ maxWidth: "34em", margin: "0 auto 2rem" }}>
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/" className="btn btn-dark">
            Return home
          </Link>
          <Link href="/pricing" className="btn" style={{ border: "1px solid var(--plum-500)", color: "var(--plum-800)" }}>
            View plans
          </Link>
        </div>
      </div>
    </main>
  );
}
