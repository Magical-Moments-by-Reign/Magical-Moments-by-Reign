import type { Metadata } from "next";
import Link from "next/link";
import { currentAccount } from "@/lib/auth-session";
import { PublicNav, PublicFooter } from "@/components/site/PublicChrome";
import InspirationCard from "@/components/inspiration/InspirationCard";
import { INSPIRATION, INSPIRATION_PHOTOS } from "@/lib/inspiration";
import "./inspiration.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Inspiration Gallery",
  description:
    "A curated showcase of real Magical Moments by Reign experiences — cinematic films and imagery for weddings, celebrations of life, birthdays, baby journeys and more.",
};

export default async function InspirationGalleryPage() {
  const signedIn = Boolean(await currentAccount());
  return (
    <div className="insp">
      <PublicNav active="get-started" signedIn={signedIn} />

      <header className="insp-hero">
        <div className="container">
          <span className="eyebrow insp-hero__eyebrow">Inspiration Gallery</span>
          <h1>Real moments, beautifully kept</h1>
          <p>
            Every experience is one of a kind. Hover a film to watch it come alive —
            then step inside to see how a single moment becomes a living keepsake.
          </p>
        </div>
      </header>

      <main className="container insp-main">
        <section className="insp-grid">
          {INSPIRATION.map((item) => (
            <InspirationCard key={item.slug} item={item} />
          ))}
        </section>

        <section className="insp-photos">
          <div className="section-head--left">
            <span className="eyebrow">The imagery</span>
            <h2>Gallery-quality, every time</h2>
            <p className="muted">A glimpse of the photography an experience can hold.</p>
          </div>
          <div className="insp-photos__grid">
            {INSPIRATION_PHOTOS.map((p) => (
              <figure className="insp-photo" key={p.url}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.caption} loading="lazy" />
                <figcaption>{p.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="insp-cta">
          <h2>Your moment is next.</h2>
          <p>Explore everything Magical Moments offers, then create a space no one else will ever have.</p>
          <div className="insp-cta__actions">
            <Link href={signedIn ? "/home" : "/get-started"} className="btn-gold">{signedIn ? "Enter your Space" : "Start exploring"}</Link>
            <Link href="/pricing" className="btn btn-dark">See plans</Link>
          </div>
        </section>
      </main>

      <PublicFooter year={new Date().getFullYear()} />
    </div>
  );
}
