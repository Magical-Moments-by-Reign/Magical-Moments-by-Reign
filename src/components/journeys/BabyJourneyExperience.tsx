"use client";

// ── The Baby Journey — a full, guided, emotional experience ──────
// Bespoke redesign per the Founder's Baby Journey spec: overlapping AI
// concierge, split overview with a visual journey path, premium feature
// cards, a full life-stage timeline, gender reveal + baby shower feature
// sections, reminders, hospital-bag checklist, chaptered gallery, richer
// marketplace, final pricing, and baby-specific FAQ — with alternating
// warm section bands and a subtle logo watermark.

import { useState } from "react";
import Link from "next/link";
import OccasionIcon from "@/components/OccasionIcon";
import PreviewFaq from "@/components/journeys/PreviewFaq";
import { conciergeFor } from "@/lib/journey-concierge";
import { galleryFor } from "@/lib/gallery-media";
import { STORY_PHOTOS } from "@/lib/story-photos";
import { PLANS, formatPrice } from "@/lib/plans";
import "./baby.css";

const IMG = (n: number) => `/gallery/baby/${String(n).padStart(2, "0")}.jpg`;

const PATH = [
  { icon: "🤍", label: "Pregnancy announcement" },
  { icon: "🩺", label: "First ultrasound" },
  { icon: "🎉", label: "Gender reveal" },
  { icon: "🎁", label: "Baby shower" },
  { icon: "🎒", label: "Hospital preparation" },
  { icon: "👶", label: "Baby's arrival" },
  { icon: "📸", label: "Monthly milestones" },
  { icon: "🎂", label: "First birthday" },
];

const FEATURES = [
  { icon: "sparkle", title: "Personalized Journey Website", body: "A private digital home for every milestone." },
  { icon: "star", title: "Planning Timeline", body: "Guided tasks, dates, and reminders." },
  { icon: "heart", title: "Magical AI Assistant", body: "Help throughout the pregnancy and first year." },
  { icon: "baby", title: "Photo & Video Galleries", body: "Store ultrasounds, announcements, celebrations, and milestones." },
  { icon: "gift", title: "Guestbook & Family Messages", body: "Let loved ones leave memories and blessings." },
  { icon: "home", title: "Privacy & Sharing Controls", body: "Choose who can view, contribute, and receive updates." },
];

const STAGES = [
  { n: 1, title: "The Beginning", img: IMG(1), items: ["Pregnancy announcement", "Due date", "First photos", "First ultrasound upload"] },
  { n: 2, title: "Gender Reveal", img: IMG(3), items: ["Create a digital gender reveal", "Send invitations", "Collect guest predictions", "Add livestream link", "Upload reveal video", "Save family reactions"] },
  { n: 3, title: "Baby Shower", img: IMG(5), items: ["Design invitations", "Schedule invitation delivery", "Manage RSVPs", "Add registry", "Track gifts", "Upload photos and videos", "Create thank-you reminders"] },
  { n: 4, title: "Pregnancy Care", img: IMG(2), items: ["Doctor appointment reminders", "Ultrasound reminders", "Test reminders", "Questions for the doctor", "Weekly pregnancy updates"] },
  { n: 5, title: "Prepare for Baby", img: IMG(6), items: ["Nursery checklist", "Hospital bag checklist", "Car-seat reminder", "Pediatrician selection", "Birth-plan documents", "Emergency contact list"] },
  { n: 6, title: "Baby's Arrival", img: IMG(4), items: ["Birth announcement", "First photos", "Birth details", "Hospital video", "Family reactions", "Going-home moment"] },
  { n: 7, title: "First Year", img: IMG(10), items: ["Monthly milestone reminders", "Growth photos", "First smile", "First tooth", "First crawl", "First word", "First steps"] },
  { n: 8, title: "First Birthday", img: IMG(16), items: ["Birthday planning", "Invitations", "RSVP tracking", "Gift registry", "Photo gallery", "Highlight video"] },
];

const REMINDERS = [
  { icon: "📅", text: "Your doctor appointment is tomorrow at 10:00 AM." },
  { icon: "💌", text: "Baby shower invitations should go out this week." },
  { icon: "🎒", text: "You're 36 weeks—let's finish your hospital bag." },
  { icon: "🚗", text: "Have you installed the car seat?" },
  { icon: "📸", text: "Olivia turns six months tomorrow. Time for milestone photos." },
  { icon: "🎂", text: "The first birthday is 30 days away. Ready to start planning?" },
];

const BAG = {
  Mom: ["ID", "Insurance card", "Toiletries", "Pajamas", "Nursing items", "Going-home clothes"],
  Baby: ["Going-home outfit", "Blanket", "Hat", "Diapers", "Feeding supplies", "Car seat"],
  Partner: ["Snacks", "Chargers", "Pillow", "Change of clothes", "Camera", "Important documents"],
};
const COMPLETION = ["Car Seat Installed", "Hospital Bag Packed", "Pediatrician Selected", "Birth Plan Uploaded"];

const GALLERY_CHAPTERS: { name: string; imgs: number[] }[] = [
  { name: "Pregnancy", imgs: [1, 2] },
  { name: "Ultrasounds", imgs: [2, 6] },
  { name: "Gender Reveal", imgs: [3, 11] },
  { name: "Baby Shower", imgs: [5, 12] },
  { name: "Birth Day", imgs: [1, 4] },
  { name: "Monthly Milestones", imgs: [8, 9, 10, 14] },
  { name: "Family Memories", imgs: [15, 19, 20, 21] },
  { name: "First Birthday", imgs: [13, 16, 17, 18] },
];

const MARKET = [
  { icon: "🎁", name: "Baby registries", body: "Everything in one shareable list." },
  { icon: "🛏", name: "Nursery & furniture", body: "Design the perfect space." },
  { icon: "📸", name: "Photographers", body: "Capture every milestone." },
  { icon: "🤰", name: "Maternity sessions", body: "Celebrate the bump." },
  { icon: "🧸", name: "Keepsakes", body: "Treasures to hold onto." },
  { icon: "🚼", name: "Baby gear", body: "Strollers, carriers & more." },
  { icon: "📚", name: "Classes & support", body: "Prepare with confidence." },
  { icon: "🍼", name: "Lactation support", body: "Help when you need it." },
  { icon: "🩺", name: "Pediatric resources", body: "Trusted care for baby." },
  { icon: "🎈", name: "Party vendors", body: "For showers & first birthdays." },
];

const FAQ = [
  { q: "Can I create a digital gender reveal?", a: "Yes — build an online reveal page, send invitations, collect guest predictions, add a livestream, and upload the reveal video." },
  { q: "Can guests vote on the baby's gender?", a: "Yes, guests can cast their predictions and you'll see the results roll in before the big reveal." },
  { q: "Can I upload the reveal video?", a: "Absolutely — store the reveal video and everyone's reactions together, forever." },
  { q: "Can you help send baby shower invitations on time?", a: "Yes. Design invitations and schedule their delivery, then track RSVPs automatically." },
  { q: "Can I add a baby registry?", a: "Yes — add registry links and track gifts in one place." },
  { q: "Can I track RSVPs?", a: "Yes, RSVPs are managed for you with reminders and a live guest list." },
  { q: "Can I receive doctor appointment reminders?", a: "Yes — Magical AI reminds you about appointments, ultrasounds, and tests." },
  { q: "Does Magical help me prepare my hospital bag?", a: "Yes, with an interactive hospital-bag checklist for Mom, Baby, and Partner." },
  { q: "Will it remind me about the car seat?", a: "Yes — you'll get a reminder to install the car seat before delivery." },
  { q: "Can family members upload photos and videos?", a: "Yes, with your permission loved ones can add photos, videos, and messages." },
  { q: "Can I keep the Journey private?", a: "Everything is private by default; you decide exactly what to share and with whom." },
  { q: "Can the Journey continue after the baby is born?", a: "Yes — it flows right into the first year and first birthday, and stays in your Magical Moments Library." },
  { q: "Can I track monthly milestones?", a: "Yes, with monthly milestone reminders and growth photos." },
  { q: "Can I turn the Journey into a first-birthday experience?", a: "Yes — it becomes a full first-birthday celebration with invitations, RSVPs, registry, and a highlight video." },
  { q: "What happens after my plan ends?", a: "We remind you well in advance, and you can download a full archive; nothing is deleted the moment a term ends." },
];

export default function BabyJourneyExperience() {
  const concierge = conciergeFor("baby");
  const heroPhoto = STORY_PHOTOS.baby;
  const [chapter, setChapter] = useState(0);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const toggle = (k: string) => setChecked((c) => ({ ...c, [k]: !c[k] }));

  function startPlanning() {
    window.dispatchEvent(new CustomEvent("mmr:ask-magical", { detail: { seed: concierge?.seed } }));
  }

  return (
    <div className="baby">
      {/* Hero */}
      <header className="baby-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="baby-hero__bg" src={heroPhoto} alt="" aria-hidden="true" />
        <div className="baby-hero__scrim" />
        <div className="baby-hero__inner">
          <span className="baby-hero__eyebrow">Baby Journey</span>
          <h1>The story of a brand-new life</h1>
          <p>From the first heartbeat to the first birthday — beautifully planned, remembered, and preserved.</p>
        </div>
      </header>

      {/* Overlapping concierge card */}
      {concierge && (
        <div className="baby-band baby-band--overlap">
          <div className="baby-wrap">
            <section className="mai mai--baby" aria-label="Magical AI Journey Assistant">
              <span className="mai__sparkle" aria-hidden="true">✦</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="mai__logo" src="/brand/logo-mark.png" alt="" aria-hidden="true" width={48} height={48} />
              <span className="mai__label">{concierge.label}</span>
              <h2 className="mai__heading">{concierge.heading}</h2>
              <p className="mai__intro">Congratulations on your growing family. I&apos;ll help you plan, remember, celebrate, and preserve every milestone—from the first heartbeat to the first birthday and beyond.</p>
              <button type="button" className="mai__cta" onClick={startPlanning}>✨ Start Planning My Journey</button>
            </section>
          </div>
        </div>
      )}

      {/* Overview — split with visual journey path (watermark band) */}
      <div className="baby-band baby-band--cream baby-watermark">
        <div className="baby-wrap baby-split">
          <div className="baby-split__text">
            <span className="baby-chapter">Your Journey</span>
            <h2 className="baby-h2">Your Journey, Beautifully Guided</h2>
            <p className="baby-lead">From the first positive test to the first birthday, Magical Moments helps families plan every celebration, remember every important appointment, and preserve every milestone in one beautiful place.</p>
          </div>
          <ol className="baby-path">
            {PATH.map((s, i) => (
              <li key={i} className="baby-path__step">
                <span className="baby-path__icon" aria-hidden="true">{s.icon}</span>
                <span className="baby-path__label">{s.label}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* What's included — 6 feature cards (watermark band) */}
      <div className="baby-band baby-band--gray baby-watermark">
        <div className="baby-wrap">
          <div className="baby-sechead">
            <span className="baby-chapter">Everything included</span>
            <h2 className="baby-h2">What&apos;s Included</h2>
          </div>
          <div className="baby-features">
            {FEATURES.map((f) => (
              <article key={f.title} className="baby-feature">
                <span className="baby-feature__icon"><OccasionIcon name={f.icon} size={26} /></span>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>

      {/* Full life-stage timeline (watermark band) */}
      <div className="baby-band baby-band--ivory baby-watermark">
        <div className="baby-wrap">
          <div className="baby-sechead">
            <span className="baby-chapter">Every chapter</span>
            <h2 className="baby-h2">The Complete Baby Journey</h2>
          </div>
          <div className="baby-timeline">
            {STAGES.map((s, i) => (
              <div key={s.n} className={`baby-stage${i % 2 ? " baby-stage--rev" : ""}`}>
                <div className="baby-stage__media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.img} alt={s.title} loading="lazy" />
                  <span className="baby-stage__num">{s.n}</span>
                </div>
                <div className="baby-stage__body">
                  <h3>{s.title}</h3>
                  <ul>{s.items.map((it) => <li key={it}>{it}</li>)}</ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gender Reveal feature (blush band) */}
      <div className="baby-band baby-band--blush">
        <div className="baby-wrap baby-split baby-split--media">
          <div className="baby-split__media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={IMG(11)} alt="Gender reveal" loading="lazy" />
          </div>
          <div className="baby-split__text">
            <span className="baby-chapter">Gender Reveal</span>
            <h2 className="baby-h2">Create the Reveal. Capture the Reaction. Keep It Forever.</h2>
            <ul className="baby-checklist baby-checklist--static">
              {["Online gender reveal page", "Digital invitations", "Guest voting", "Countdown timer", "Livestream option", "Reveal-video upload", "Family reaction gallery", "Social-sharing tools"].map((x) => <li key={x}>{x}</li>)}
            </ul>
            <button type="button" className="baby-btn" onClick={startPlanning}>Create My Gender Reveal</button>
          </div>
        </div>
      </div>

      {/* Baby Shower planning board (lavender band) */}
      <div className="baby-band baby-band--lavender">
        <div className="baby-wrap">
          <div className="baby-sechead">
            <span className="baby-chapter">Baby Shower</span>
            <h2 className="baby-h2">Your Baby Shower, Planned Beautifully</h2>
          </div>
          <div className="baby-board">
            {["Invitation creation", "Scheduled invitation delivery", "RSVP tracking", "Registry links", "Guest list", "Vendor checklist", "Decorations", "Food planning", "Photo and video uploads", "Thank-you reminders"].map((x) => (
              <div key={x} className="baby-board__card">{x}</div>
            ))}
          </div>
          <div className="baby-center"><button type="button" className="baby-btn" onClick={startPlanning}>Plan My Baby Shower</button></div>
        </div>
      </div>

      {/* Never miss a moment (charcoal band) */}
      <div className="baby-band baby-band--charcoal">
        <div className="baby-wrap">
          <div className="baby-sechead baby-sechead--light">
            <span className="baby-chapter baby-chapter--light">Magical AI</span>
            <h2 className="baby-h2 baby-h2--light">Never Miss What Matters</h2>
          </div>
          <div className="baby-reminders">
            {REMINDERS.map((r, i) => (
              <div key={i} className="baby-reminder">
                <span className="baby-reminder__icon" aria-hidden="true">{r.icon}</span>
                <span>{r.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ready for baby — hospital bag (ivory band) */}
      <div className="baby-band baby-band--ivory">
        <div className="baby-wrap">
          <div className="baby-sechead">
            <span className="baby-chapter">Prepare</span>
            <h2 className="baby-h2">Ready for Baby</h2>
          </div>
          <div className="baby-bag">
            {(Object.keys(BAG) as (keyof typeof BAG)[]).map((col) => (
              <div key={col} className="baby-bag__col">
                <h3>For {col}</h3>
                <ul className="baby-checklist">
                  {BAG[col].map((item) => {
                    const key = `${col}:${item}`;
                    return (
                      <li key={key}>
                        <button type="button" className={`baby-check${checked[key] ? " baby-check--on" : ""}`} onClick={() => toggle(key)} aria-pressed={!!checked[key]}>
                          <span className="baby-check__box" aria-hidden="true">{checked[key] ? "✓" : ""}</span>{item}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          <div className="baby-complete">
            {COMPLETION.map((c) => (
              <button key={c} type="button" className={`baby-complete__item${checked[c] ? " baby-complete__item--on" : ""}`} onClick={() => toggle(c)} aria-pressed={!!checked[c]}>
                <span aria-hidden="true">{checked[c] ? "✓" : "○"}</span> {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Gallery by chapter (cream band) */}
      <div className="baby-band baby-band--cream">
        <div className="baby-wrap">
          <div className="baby-sechead">
            <span className="baby-chapter">Memories</span>
            <h2 className="baby-h2">Watch Their Story Grow</h2>
          </div>
          <div className="baby-tabs" role="tablist" aria-label="Gallery chapters">
            {GALLERY_CHAPTERS.map((c, i) => (
              <button key={c.name} role="tab" aria-selected={chapter === i} className={`baby-tab${chapter === i ? " baby-tab--on" : ""}`} onClick={() => setChapter(i)}>{c.name}</button>
            ))}
          </div>
          <div className="baby-gallery">
            {GALLERY_CHAPTERS[chapter].imgs.map((n) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={n} src={IMG(n)} alt={`${GALLERY_CHAPTERS[chapter].name}`} loading="lazy" />
            ))}
          </div>
        </div>
      </div>

      {/* Marketplace (gray band) */}
      <div className="baby-band baby-band--gray">
        <div className="baby-wrap">
          <div className="baby-sechead">
            <span className="baby-chapter">Journey Marketplace</span>
            <h2 className="baby-h2">Trusted for Every Step</h2>
          </div>
          <div className="baby-market">
            {MARKET.map((m) => (
              <article key={m.name} className="baby-market__card">
                <span className="baby-market__icon" aria-hidden="true">{m.icon}</span>
                <h3>{m.name}</h3>
                <p>{m.body}</p>
              </article>
            ))}
          </div>
          <p className="baby-note">Partners and member savings are being added.</p>
        </div>
      </div>

      {/* Pricing — final, confident (ivory band) */}
      <div className="baby-band baby-band--ivory">
        <div className="baby-wrap">
          <div className="baby-sechead">
            <span className="baby-chapter">Membership</span>
            <h2 className="baby-h2">Choose How Long to Preserve It</h2>
          </div>
          <div className="baby-pricing">
            {PLANS.map((p) => (
              <article key={p.id} className={`baby-price${p.badge ? " baby-price--featured" : ""}`}>
                {p.badge && <span className="baby-price__badge">{p.badge}</span>}
                <h3>{p.name}</h3>
                <div className="baby-price__term">{p.termShort}</div>
                <div className="baby-price__amt">{formatPrice(p.price)}</div>
                {p.savingsNote && <div className="baby-price__save">{p.savingsNote}</div>}
                <div className="baby-price__domain">{p.domain}</div>
                <ul>{p.features.slice(0, 5).map((f) => <li key={f}>{f}</li>)}</ul>
                <Link href={`/create?type=baby`} className="baby-btn baby-btn--full">{p.cta}</Link>
              </article>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ (cream band) */}
      <div className="baby-band baby-band--cream">
        <div className="baby-wrap baby-wrap--narrow">
          <div className="baby-sechead">
            <span className="baby-chapter">Questions</span>
            <h2 className="baby-h2">Baby Journey FAQ</h2>
          </div>
          <PreviewFaq items={FAQ} />
        </div>
      </div>

      {/* Closing CTA (blush band) */}
      <div className="baby-band baby-band--blush">
        <div className="baby-wrap baby-center">
          <h2 className="baby-h2">Begin your Baby Journey</h2>
          <p className="baby-lead baby-lead--center">Plan the pregnancy, celebrate every milestone, and preserve the entire first chapter of your baby&apos;s life.</p>
          <div className="baby-cta-row">
            <button type="button" className="baby-btn" onClick={startPlanning}>✨ Start Planning My Journey</button>
            <Link href="/journeys/baby/preview" className="baby-btn baby-btn--ghost">Try a 5-day Preview</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
