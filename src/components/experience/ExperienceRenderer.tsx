// ── ExperienceRenderer ──────────────────────────────────────────
// Turns a (DesignSpec + content) pair into a fully-themed, unique
// page. This is the single renderer behind EVERY customer experience:
// it injects the engine's palette/fonts as CSS variables, applies the
// chosen animation + background, and lays out sections in the order
// the engine decided.

import type { CSSProperties } from "react";
import type { DesignSpec, ExperienceContent, SectionKind } from "@/types";
import { SECTION_COMPONENTS } from "@/components/experience/sections";
import "@/app/experience.css";

interface Props {
  designSpec: DesignSpec;
  content: ExperienceContent;
  experienceType?: string;
  slug?: string;
}

// Sections a Celebration of Life should always offer (His Story, Photo
// Gallery, Favorite Memories, In Loving Memory, Family Messages), so the
// memorial hero nav never links to a missing section — even for
// experiences seeded before these were guaranteed.
const MEMORIAL_SECTIONS: SectionKind[] = ["story", "gallery", "timeline", "quote", "guestbook"];

function effectiveOrder(order: SectionKind[], experienceType?: string): SectionKind[] {
  if (experienceType !== "memorial") return order;
  const present = new Set(order);
  const missing = MEMORIAL_SECTIONS.filter((s) => !present.has(s));
  if (missing.length === 0) return order;
  const footerIdx = order.indexOf("footer");
  if (footerIdx === -1) return [...order, ...missing];
  return [...order.slice(0, footerIdx), ...missing, ...order.slice(footerIdx)];
}

export default function ExperienceRenderer({ designSpec, content, experienceType, slug }: Props) {
  const p = designSpec.palette;
  const sectionOrder = effectiveOrder(designSpec.sectionOrder, experienceType);

  const styleVars = {
    "--mbr-bg": p.bg,
    "--mbr-surface": p.surface,
    "--mbr-text": p.text,
    "--mbr-muted": p.muted,
    "--mbr-primary": p.primary,
    "--mbr-secondary": p.secondary,
    "--mbr-accent": p.accent,
    "--mbr-hero-from": p.heroFrom,
    "--mbr-hero-to": p.heroTo,
    "--mbr-on-dark": p.onDark,
    "--mbr-radius": `${designSpec.radius}px`,
    "--mbr-font-display": `"${designSpec.fonts.display}", Georgia, serif`,
    "--mbr-font-body": `"${designSpec.fonts.body}", system-ui, sans-serif`,
  } as CSSProperties;

  return (
    <>
      {/* Per-experience fonts, chosen by the design engine. */}
      <link rel="stylesheet" href={designSpec.fonts.googleUrl} />
      <div
        className={`mbr mbr-anim-${designSpec.animation} mbr-bg-${designSpec.background}`}
        style={styleVars}
        data-mood={designSpec.mood}
      >
        {sectionOrder.map((kind: SectionKind, i) => {
          const Component = SECTION_COMPONENTS[kind];
          if (!Component) return null;
          const variant = designSpec.variants[kind] ?? "default";
          return (
            <div key={`${kind}-${i}`}>
              {i === 1 && <span id="mbr-explore" aria-hidden="true" />}
              <Component content={content} spec={designSpec} variant={variant} experienceType={experienceType} slug={slug} />
            </div>
          );
        })}
      </div>
    </>
  );
}
