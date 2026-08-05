import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Social Studio", robots: { index: false } };

// Social Studio. We NEVER claim a post was published unless it actually was.
// Live posting depends on connected platforms, so those actions are labeled
// "Coming Soon" until the integration is switched on.
export default async function SocialStudioPage() {
  const account = await requireAccount("/dashboard/social-studio");
  const [connections, drafts] = await Promise.all([
    prisma.socialConnection.count({ where: { accountId: account.id } }).catch(() => 0),
    prisma.socialShare.count({ where: { accountId: account.id } }).catch(() => 0),
  ]);

  return (
    <>
      <div className="pg-head">
        <span className="pg-eyebrow">Share your story</span>
        <h1 className="pg-title">Social Studio</h1>
        <p className="pg-sub">Create and manage social content for your Journeys. Draft captions, preview posts, and share links — nothing is ever posted without your say-so.</p>
        <div className="pg-actions">
          <span className="btn btn--gold" aria-disabled="true" style={{ opacity: .8, cursor: "default" }}>Create a post <span className="badge badge--soon" style={{ marginLeft: ".4rem" }}>Coming Soon</span></span>
          <Link href="/dashboard/journeys" className="btn btn--ghost">Choose a Journey</Link>
        </div>
      </div>

      <div className="grid grid--stats">
        <div className="stat"><span className="stat__n">{connections}</span><span className="stat__k">Connected Platforms</span></div>
        <div className="stat"><span className="stat__n">{drafts}</span><span className="stat__k">Saved Shares</span></div>
        <div className="stat"><span className="stat__n">0</span><span className="stat__k">Scheduled Posts</span></div>
      </div>

      <section className="sec">
        <div className="sec__h"><h2 className="sec__t">Get started</h2></div>
        {connections === 0 && (
          <div className="empty" style={{ marginBottom: "1rem" }}>
            <div className="empty__mark"><svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.2 11 L15.8 7 M8.2 13 L15.8 17" /></svg></div>
            <p className="empty__t">No platforms connected yet</p>
            <p className="empty__s">Connect Instagram, Facebook, or others to schedule and share your Journeys. We&rsquo;ll never post anything without your confirmation.</p>
          </div>
        )}
        <div className="list">
          <div className="soon-row"><span>Connect Instagram / Facebook / TikTok / Pinterest</span><span className="badge badge--soon">Coming Soon</span></div>
          <div className="soon-row"><span>Caption ideas &amp; image/video previews</span><span className="badge badge--soon">Coming Soon</span></div>
          <div className="soon-row"><span>Scheduled posts</span><span className="badge badge--soon">Coming Soon</span></div>
        </div>
        <p className="note" style={{ marginTop: ".8rem" }}>You can still create shareable Journey links today from the Sharing page.</p>
      </section>
    </>
  );
}
