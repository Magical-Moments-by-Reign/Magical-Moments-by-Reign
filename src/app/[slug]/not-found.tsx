import Link from "next/link";

export default function ExperienceNotFound() {
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
          This moment hasn&apos;t been created yet
        </h1>
        <p className="muted" style={{ maxWidth: "34em", margin: "0 auto 2rem" }}>
          There&apos;s no experience at this address. Perhaps it&apos;s waiting to
          be made?
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/create" className="btn btn-dark">
            Create an experience
          </Link>
          <Link href="/dashboard" className="btn" style={{ border: "1px solid var(--plum-500)", color: "var(--plum-800)" }}>
            View dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
