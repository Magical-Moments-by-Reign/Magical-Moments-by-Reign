import Link from "next/link";
import { createExperienceAction } from "@/app/actions";
import { EXPERIENCE_TYPES } from "@/lib/experience-types";

export const metadata = { title: "Create an experience" };

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <>
      <nav className="nav">
        <Link href="/" className="brand">
          Magical <span>by Reign</span>
        </Link>
        <div className="nav-links">
          <Link href="/dashboard">Dashboard</Link>
        </div>
      </nav>

      <header className="app-header">
        <div className="container">
          <span className="eyebrow" style={{ color: "var(--gold-400)" }}>
            A new moment
          </span>
          <h1>Create an experience</h1>
          <p>
            Pick the occasion and give it a name. The platform will design it,
            provision a unique URL, and publish it — instantly.
          </p>
        </div>
      </header>

      <main className="container" style={{ padding: "3rem 0 5rem" }}>
        <div className="form-wrap">
          <form action={createExperienceAction} className="form-card">
            {error === "missing" && (
              <div className="form-error">
                Please choose an occasion and enter a title.
              </div>
            )}

            <div className="field">
              <label>Occasion</label>
              <div className="type-picker">
                {EXPERIENCE_TYPES.map((t, i) => (
                  <div className="type-option" key={t.id}>
                    <input
                      type="radio"
                      name="type"
                      id={`type-${t.id}`}
                      value={t.id}
                      defaultChecked={i === 0}
                      required
                    />
                    <label htmlFor={`type-${t.id}`}>
                      <span className="emoji" aria-hidden="true">
                        {t.emoji}
                      </span>
                      {t.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="field">
              <label htmlFor="title">Title</label>
              <input
                id="title"
                name="title"
                type="text"
                placeholder="e.g. The Smith Wedding"
                required
              />
              <p className="hint">The headline that greets every visitor.</p>
            </div>

            <div className="field">
              <label htmlFor="subtitle">Subtitle (optional)</label>
              <input
                id="subtitle"
                name="subtitle"
                type="text"
                placeholder="e.g. June 14th, 2027 · Napa Valley"
              />
            </div>

            <div className="field">
              <label htmlFor="slug">Custom link (optional)</label>
              <input
                id="slug"
                name="slug"
                type="text"
                placeholder="smithwedding"
              />
              <p className="hint">
                Your experience will live at magicalbyreign.com/<strong>your-link</strong>.
                Leave blank and we&apos;ll create one from the title.
              </p>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
              Create &amp; publish ✨
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
