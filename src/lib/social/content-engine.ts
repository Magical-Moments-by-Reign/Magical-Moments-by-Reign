// ── Ask Magical: social content assistance ──────────────────────
// Prepares platform-appropriate captions, hashtags, titles, CTAs and
// a link back to the customer's Magical Moment. Deterministic today
// (so it works with zero external dependencies), with a clear AI seam:
// when ANTHROPIC_API_KEY is set, generateSocialContent() is where a
// model produces bespoke copy, validated and falling back to this.
//
// Nothing is ever published from here — this only PREPARES drafts the
// customer edits and explicitly approves.

import { getPlatform, defaultFormat, type PlatformId } from "@/lib/social/platforms";

export interface ShareSource {
  experienceTitle: string;
  experienceType: string;
  experienceUrl: string; // link back to the Magical Moment
  sourceType: string; // update | photo | gallery | announcement | video | milestone
  sourceLabel: string; // e.g. "Gender reveal", "New gallery"
  aiGenerated?: boolean; // media is AI-generated/enhanced
}

export interface PlatformContent {
  platform: PlatformId;
  format: string;
  title: string; // used by YouTube; ignored elsewhere but kept for review
  captionSuggested: string;
  captionShort: string;
  captionLong: string;
  hashtags: string[];
  cta: string;
  link: string;
  visibility: string;
  coverHint: string;
  aiNoticeRequired: boolean;
}

const BASE_TAGS: Record<string, string[]> = {
  wedding: ["MagicalMoment", "WeddingDay", "LoveStory", "Forever"],
  birthday: ["MagicalMoment", "Birthday", "Celebrate", "MakeAWish"],
  baby: ["MagicalMoment", "BabyJourney", "OhBaby", "LittleMiracle"],
  memorial: ["MagicalMoment", "InLovingMemory", "ForeverRemembered"],
  vacation: ["MagicalMoment", "Wanderlust", "Memories", "Adventure"],
  anniversary: ["MagicalMoment", "Anniversary", "StillInLove"],
  graduation: ["MagicalMoment", "Graduation", "ClassOf", "ProudMoment"],
  proposal: ["MagicalMoment", "SheSaidYes", "Engaged", "Proposal"],
  business: ["MagicalMoment", "GrandOpening", "NewBeginnings"],
  reunion: ["MagicalMoment", "FamilyReunion", "Together"],
};

function captions(src: ShareSource) {
  const t = src.experienceTitle;
  const label = src.sourceLabel;
  const suggested = `${label} ✨ We're sharing a little magic from ${t}. Come see the full story 💛`;
  const short = `${label} ✨ — from ${t} 💛`;
  const long = `${label} 🌟\n\nEvery moment deserves a masterpiece, and this one is close to our hearts. We've added something new to ${t} and couldn't wait to share it with you.\n\nTap the link to experience the full story, leave a note, and follow along as it grows. 💛`;
  return { suggested, short, long };
}

/** Deterministic per-platform content composer. */
export function composeSocialContent(
  src: ShareSource,
  platforms: PlatformId[],
): PlatformContent[] {
  const tags = BASE_TAGS[src.experienceType] ?? ["MagicalMoment", "Memories"];
  const c = captions(src);

  return platforms.map((pid) => {
    const platform = getPlatform(pid)!;
    const fmt = defaultFormat(pid);

    // Platform-tailored copy — NOT one identical post everywhere.
    let captionSuggested = c.suggested;
    let cta = "Tap the link in our profile to see the full story.";
    let hashtags = tags;
    const title = `${src.sourceLabel} — ${src.experienceTitle}`;
    let visibility = "public";
    let coverHint = "A bright, in-focus photo works best.";

    switch (pid) {
      case "instagram":
        cta = "Link in bio to experience the full story 💛";
        hashtags = [...tags, "InstaMemories", "Reels"];
        coverHint = "Square (1:1) or vertical (9:16) crops best on Instagram.";
        break;
      case "facebook":
        cta = "See the full Magical Moment 👉 " + src.experienceUrl;
        hashtags = tags.slice(0, 3);
        coverHint = "Landscape (1.91:1) previews best in the Facebook feed.";
        break;
      case "tiktok":
        captionSuggested = `${src.sourceLabel} ✨ #${tags[0]} — the full story is in our link 💛`;
        cta = "Full story at the link in our profile.";
        hashtags = [...tags, "fyp", "foryou"];
        coverHint = "Vertical 9:16 video or photo; pick an eye-catching first frame.";
        break;
      case "youtube":
        cta = "Watch the full Magical Moment and subscribe for more.";
        hashtags = [...tags, "Shorts"];
        visibility = "unlisted"; // safe default until the customer chooses
        coverHint = "A clear, high-contrast thumbnail with a face performs best.";
        break;
    }

    return {
      platform: pid,
      format: fmt.id,
      title,
      captionSuggested,
      captionShort: c.short,
      captionLong: c.long,
      hashtags,
      cta,
      link: src.experienceUrl,
      visibility,
      coverHint,
      aiNoticeRequired: Boolean(src.aiGenerated),
    };
  });
}

/** Public entry point. AI seam mirrors the design engine. */
export async function generateSocialContent(
  src: ShareSource,
  platforms: PlatformId[],
): Promise<PlatformContent[]> {
  // AI HOOK — future:
  //   if (process.env.ANTHROPIC_API_KEY) {
  //     const copy = await askModelForSocialCopy(src, platforms);
  //     if (isValid(copy)) return copy;
  //   }
  return composeSocialContent(src, platforms);
}
