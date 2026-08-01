// ── Supported social platforms ──────────────────────────────────
// Metadata drives the whole studio: which formats each platform
// supports, its OAuth scopes, and whether direct publishing is
// available (vs. draft/fallback). Every integration must follow the
// platform's CURRENT official API rules, eligibility, app-review,
// scopes, quotas, and publishing limitations — these values are the
// scaffolding those real integrations plug into.

export type PlatformId = "instagram" | "facebook" | "tiktok" | "youtube";

export interface PlatformFormat {
  id: string;
  label: string;
  aspect: string; // e.g. "1:1", "9:16", "16:9"
  kind: "image" | "video" | "carousel";
}

export interface Platform {
  id: PlatformId;
  label: string;
  brand: string; // accent color
  connectLabel: string; // "Connect Instagram"
  /** OAuth scopes the real integration will request. */
  scopes: string[];
  /** Whether the platform supports API direct publishing in general.
   *  Actual availability still depends on account type + app review. */
  directPost: boolean;
  /** When direct posting is unavailable, what we fall back to. */
  fallback: "draft" | "prepare";
  formats: PlatformFormat[];
  /** Human note about eligibility / limitations, shown in the UI. */
  note: string;
}

export const PLATFORMS: Platform[] = [
  {
    id: "instagram",
    label: "Instagram",
    brand: "#c13584",
    connectLabel: "Connect Instagram",
    scopes: ["instagram_basic", "instagram_content_publish", "pages_show_list"],
    directPost: true,
    fallback: "prepare",
    formats: [
      { id: "feed", label: "Feed image", aspect: "1:1", kind: "image" },
      { id: "carousel", label: "Carousel", aspect: "1:1", kind: "carousel" },
      { id: "reel", label: "Reel", aspect: "9:16", kind: "video" },
      { id: "story", label: "Story", aspect: "9:16", kind: "image" },
    ],
    note: "Publishing requires a Professional (Business/Creator) account linked to a Facebook Page, via the Instagram Graph API.",
  },
  {
    id: "facebook",
    label: "Facebook",
    brand: "#1877f2",
    connectLabel: "Connect Facebook",
    scopes: ["pages_manage_posts", "pages_read_engagement", "pages_show_list"],
    directPost: true,
    fallback: "prepare",
    formats: [
      { id: "feed", label: "Feed post", aspect: "1.91:1", kind: "image" },
      { id: "album", label: "Photo album", aspect: "1:1", kind: "carousel" },
      { id: "video", label: "Video", aspect: "16:9", kind: "video" },
    ],
    note: "Page posting requires a Page the customer manages and the appropriate Page permissions via the Facebook Graph API.",
  },
  {
    id: "tiktok",
    label: "TikTok",
    brand: "#010101",
    connectLabel: "Connect TikTok",
    scopes: ["user.info.basic", "video.upload", "video.publish"],
    directPost: false, // Direct Post requires audited app + eligibility.
    fallback: "draft",
    formats: [
      { id: "video", label: "Vertical video", aspect: "9:16", kind: "video" },
      { id: "photo", label: "Photo post", aspect: "9:16", kind: "image" },
      { id: "draft", label: "Upload as draft", aspect: "9:16", kind: "video" },
    ],
    note: "Direct Post requires an approved (audited) app and eligible account; otherwise media is uploaded to the customer's TikTok drafts to finish in-app.",
  },
  {
    id: "youtube",
    label: "YouTube",
    brand: "#ff0000",
    connectLabel: "Connect YouTube",
    scopes: ["https://www.googleapis.com/auth/youtube.upload"],
    directPost: true,
    fallback: "prepare",
    formats: [
      { id: "video", label: "Standard video", aspect: "16:9", kind: "video" },
      { id: "short", label: "YouTube Short", aspect: "9:16", kind: "video" },
    ],
    note: "Uploads use the YouTube Data API. New/unverified API projects may be limited to private visibility until audited.",
  },
];

export function getPlatform(id: string): Platform | undefined {
  return PLATFORMS.find((p) => p.id === id);
}

export function defaultFormat(id: PlatformId): PlatformFormat {
  return getPlatform(id)!.formats[0];
}
