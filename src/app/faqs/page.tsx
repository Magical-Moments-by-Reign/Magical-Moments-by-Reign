import type { Metadata } from "next";
import Link from "next/link";
import { currentAccount } from "@/lib/auth-session";
import { PublicNav, PublicFooter } from "@/components/site/PublicChrome";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "FAQs — Magical Moments by Reign",
  description: "Answers to common questions about Magical Moments by Reign — how it works, memberships, privacy, and your personal concierge.",
};

// Honest, general FAQ. Anything with finalized specifics (exact pricing) links
// to the page that owns the truth (/pricing) rather than restating figures.
const FAQS: { q: string; a: string }[] = [
  { q: "What is Magical Moments by Reign?", a: "It's your Magical Space — one beautiful place to create, organize, celebrate, and preserve the meaningful moments of your life, from a wedding or a new baby to buying a home or preserving a family legacy. A personal concierge guides you along the way." },
  { q: "Do I need an account to explore?", a: "No. The Get Started experience is open to everyone — take your time, explore every section, and get inspired. You only create your Magical Space when you're ready." },
  { q: "How do memberships work?", a: "You choose a plan that fits the chapter of life you're in, and every paid membership includes the core features. You can always upgrade later. You'll find the current plans and exact pricing on our Memberships & Pricing page." },
  { q: "What is the personal concierge?", a: "When you enter your Magical Space, you're greeted by a personal concierge that you can name yourself. It helps you create, organize, and keep track of your moments. For anything that calls for a licensed professional — legal, financial, medical, or similar — it points you to a qualified expert rather than giving advice it shouldn't." },
  { q: "Is my information private and secure?", a: "Yes. Your Magical Space is private to you, protected with bank-level security. We're careful and deliberate about your information — it's yours." },
  { q: "Can my whole family use it?", a: "Yes. Family members can each have their own account and their own space, and you can connect the people you love so your journeys can be shared when you choose." },
  { q: "What kinds of experiences can I create?", a: "Weddings, birthdays, baby journeys, graduations, travel, a new home, celebrations of life, business milestones, and family legacy — with more chapters arriving over time." },
  { q: "How do I get started?", a: "Explore the Get Started experience to see everything we offer, then choose Create Your Space when you're ready to begin." },
];

export default async function FaqsPage() {
  const signedIn = Boolean(await currentAccount());
  return (
    <div className="gs">
      <PublicNav active="get-started" signedIn={signedIn} />
      <header className="gs-phead">
        <span className="gs-phead__eye">Get Started</span>
        <h1 className="gs-phead__t">Questions, <i>beautifully answered</i></h1>
        <p className="gs-phead__s">Everything you might be wondering about Magical Moments — and how we help you create, organize, and celebrate life&apos;s most important moments.</p>
      </header>

      <section className="gs-faq">
        {FAQS.map((f) => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
        <p className="gs-faq__cta">
          Still have a question? <Link href="/contact">We&apos;d love to help →</Link>
        </p>
      </section>

      <PublicFooter year={new Date().getFullYear()} />
    </div>
  );
}
