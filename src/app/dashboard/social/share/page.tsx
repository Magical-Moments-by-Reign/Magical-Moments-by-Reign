import Link from "next/link";
import SiteNav from "@/components/site/SiteNav";
import { getCurrentUserId } from "@/lib/session";
import { listConnections } from "@/lib/social/connections";
import { listExperiences } from "@/lib/experiences";
import ShareComposer from "@/components/social/ShareComposer";
import "../social.css";
import "./share.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Share a magical update" };

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://magicalmomentsbyreign.com";

export default async function SharePage() {
  const userId = await getCurrentUserId();
  const [connections, experiences] = await Promise.all([
    listConnections(userId),
    listExperiences(),
  ]);

  const connected = connections
    .filter((c) => c.status === "CONNECTED")
    .map((c) => ({ platform: c.platform, profileName: c.profileName }));

  const expOptions = experiences.map((e) => ({
    id: e.id,
    slug: e.slug,
    title: e.title,
    type: e.type,
    url: `${BASE}/${e.slug}`,
    cover: e.content.gallery?.[0]?.url ?? "",
    gallery: (e.content.gallery ?? []).slice(0, 6).map((g) => g.url),
  }));

  return (
    <div className="ss">
      <SiteNav />
      <header className="ss-header">
        <div className="container">
          <div className="ss-crumb">
            <Link href="/dashboard/social" className="ss-back">
              ← Magical Social Studio
            </Link>
          </div>
          <span className="eyebrow">Share workflow</span>
          <h1>Would you like to share this magical update?</h1>
          <p>
            Ask Magical will prepare a version optimized for each platform. You
            review and approve everything — nothing is ever posted automatically.
          </p>
        </div>
      </header>

      <main className="ss-main">
        <div className="container">
          <ShareComposer connected={connected} experiences={expOptions} />
        </div>
      </main>
    </div>
  );
}
