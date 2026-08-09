// ── Today — news provider (SERVER ONLY) ──────────────────────────
// Generic NewsProvider interface + a NewsAPI (newsapi.org) adapter. We only
// ever display headline/source/image/snippet/time/link — NEVER full article
// bodies (that's the publisher's content, not ours to reproduce).

export type NewsSection = "top" | "us" | "world" | "entertainment" | "business" | "technology" | "health" | "sports";

export interface NewsSearchParams {
  section: NewsSection;
  pageSize?: number;
}

export interface NewsStory {
  id: string; // stable hash of the source URL
  headline: string;
  source: string;
  imageUrl?: string;
  snippet?: string;
  publishedAt: string; // ISO
  url: string; // Read More → the publisher, always
}

export interface NewsProvider {
  readonly slug: string;
  readonly name: string;
  readonly attribution: string;
  isConfigured(): boolean;
  topStories(params: NewsSearchParams): Promise<NewsStory[] | null>;
}

const NEWSAPI_BASE = "https://newsapi.org/v2";

// NewsAPI's `/top-headlines` `category` param — world/us aren't native
// categories there, so those two go through `/everything` with a country/
// topic query instead; everything else maps straight to a category.
const CATEGORY_MAP: Partial<Record<NewsSection, string>> = {
  top: "general",
  entertainment: "entertainment",
  business: "business",
  technology: "technology",
  health: "health",
  sports: "sports",
};

function newsApiKey(): string | undefined {
  return process.env.NEWS_API_KEY || undefined;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Pure: map one NewsAPI article → our story shape. Exported for tests. */
export function mapArticle(a: any): NewsStory | null {
  const url = typeof a?.url === "string" ? a.url : "";
  const headline = typeof a?.title === "string" ? a.title : "";
  if (!url || !headline) return null;
  return {
    id: Buffer.from(url).toString("base64url").slice(0, 40),
    headline,
    source: typeof a?.source?.name === "string" ? a.source.name : "Unknown source",
    imageUrl: typeof a?.urlToImage === "string" && a.urlToImage ? a.urlToImage : undefined,
    snippet: typeof a?.description === "string" ? a.description : undefined,
    publishedAt: typeof a?.publishedAt === "string" ? a.publishedAt : new Date().toISOString(),
    url,
  };
}

export const NewsApiProvider: NewsProvider = {
  slug: "newsapi",
  name: "NewsAPI",
  attribution: "Powered by NewsAPI.org",

  isConfigured(): boolean {
    return Boolean(newsApiKey());
  },

  async topStories(params: NewsSearchParams): Promise<NewsStory[] | null> {
    const key = newsApiKey();
    if (!key) return null;
    const pageSize = Math.min(Math.max(params.pageSize ?? 10, 1), 30);

    const q = new URLSearchParams();
    q.set("pageSize", String(pageSize));
    q.set("language", "en");

    let path = "/top-headlines";
    if (params.section === "world") {
      path = "/everything";
      q.set("q", "world news");
      q.set("sortBy", "publishedAt");
    } else if (params.section === "us") {
      q.set("country", "us");
    } else {
      q.set("country", "us");
      q.set("category", CATEGORY_MAP[params.section] ?? "general");
    }

    try {
      const res = await fetch(`${NEWSAPI_BASE}${path}?${q.toString()}`, {
        headers: { "X-Api-Key": key },
        next: { revalidate: 900 },
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!Array.isArray(data?.articles)) return null;
      return data.articles.map(mapArticle).filter((s: NewsStory | null): s is NewsStory => s !== null);
    } catch {
      return null;
    }
  },
};
