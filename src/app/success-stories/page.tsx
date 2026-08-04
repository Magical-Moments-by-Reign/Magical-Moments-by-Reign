import type { Metadata } from "next";
import Link from "next/link";
import { currentAccount } from "@/lib/auth-session";
import { PublicNav, PublicFooter } from "@/components/site/PublicChrome";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Success Stories — Magical Moments by Reign",
  description: "The kinds of journeys Magical Moments by Reign is built for — and an invitation to share your own.",
};

// Honesty: we don't yet have real member testimonials, so we do NOT invent
// named quotes or fabricated results. Instead we show clearly-illustrative
// vignettes of the journeys the platform is built for, and invite real members
// to share theirs (to be featured with permission as they arrive).
const STORIES: { tag: string; line: string; body: string }[] = [
  { tag: "The Wedding", line: "Two stories becoming one, beautifully kept.", body: "From the proposal to the last dance — invitations, the guest list, the registry, and every photo gathered into one living keepsake the couple returns to for years." },
  { tag: "The Baby Journey", line: "A living timeline that grows with your little one.", body: "From the first heartbeat onward — milestones, photo albums, and memories preserved so the whole family can watch the story unfold." },
  { tag: "Celebration of Life", line: "A life beautifully lived, lovingly remembered.", body: "A gentle, dignified place to gather photographs, tributes, and the stories that keep a loved one close." },
  { tag: "The New Home", line: "From finding the perfect place to making it yours.", body: "Guidance through every step of a home journey, with documents, checklists, and the moments of arriving somewhere that finally feels like home." },
  { tag: "The Graduation", line: "The whole senior story, in one place.", body: "Countdowns, blessings, a gallery, and a registry — the milestones of a proud chapter kept together." },
  { tag: "The Legacy", line: "Your story, preserved for generations.", body: "A family's values, memories, and history — gathered thoughtfully so they can be passed on to the people who come next." },
];

export default async function SuccessStoriesPage() {
  const signedIn = Boolean(await currentAccount());
  return (
    <div className="gs">
      <PublicNav active="get-started" signedIn={signedIn} />
      <header className="gs-phead">
        <span className="gs-phead__eye">Success Stories</span>
        <h1 className="gs-phead__t">The journeys we&apos;re <i>built for</i></h1>
        <p className="gs-phead__s">Every life is full of moments worth keeping. Here&apos;s a glimpse of the journeys Magical Moments is designed to hold — and the kind of story yours could become.</p>
        <span className="gs-phead__note">Illustrative examples — real member stories will be featured here, with permission, as our community grows.</span>
      </header>

      <section className="gs-stories">
        <div className="gs-stories__grid">
          {STORIES.map((s) => (
            <article key={s.tag} className="gs-story">
              <span className="gs-story__tag">{s.tag}</span>
              <p className="gs-story__q">&ldquo;{s.line}&rdquo;</p>
              <p className="gs-story__b">{s.body}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="gs-storyband">
        <h3>Your story could be next.</h3>
        <p>Start your own Magical Space and begin the journey worth remembering.</p>
        <Link href={signedIn ? "/home" : "/signup"} className="gs-band__cta">
          {signedIn ? "Enter your Space" : "Create Your Space"} <span aria-hidden="true">→</span>
        </Link>
      </div>

      <PublicFooter year={new Date().getFullYear()} />
    </div>
  );
}
