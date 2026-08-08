import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { listRooms } from "@/lib/live/rooms";
import { agoraConfigured } from "@/lib/live/agora";
import { LIVE_STATUS } from "@/lib/live/core";
import "./live.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Live", robots: { index: false } };

export default async function LiveHubPage({ searchParams }: { searchParams: Promise<{ slug?: string }> }) {
  const account = await requireAccount("/dashboard/live");
  const { slug } = await searchParams;

  const [rooms, occasion] = await Promise.all([
    listRooms(account.id).catch(() => []),
    slug ? prisma.experience.findFirst({ where: { slug, accountId: account.id }, select: { id: true, title: true } }) : null,
  ]);

  const q = slug ? `&slug=${encodeURIComponent(slug)}` : "";

  return (
    <div className="lv-page">
      <div className="pg-head">
        <span className="pg-eyebrow">✦ Magical Moments Live</span>
        <h1 className="pg-title">Magical Live</h1>
        <p className="pg-sub">Share any moment with the people who matter — live. You create the moment; we handle the room, the secure invitations, reminders, and guest access. Easier than a video call.</p>
      </div>

      {!agoraConfigured() && (
        <div className="lv-note">Live streaming isn&apos;t fully connected yet. You can set everything up now; guests can join once the Agora keys are configured on the server.</div>
      )}

      {/* Two ways to begin */}
      <div className="lv-start">
        <Link href={`/dashboard/live/new?mode=now${q}`} className="lv-start__card">
          <span className="lv-start__icon" aria-hidden="true">🔴</span>
          <span className="lv-start__t">Go Live Now</span>
          <span className="lv-start__d">Create a secure room and invite your family in the next minute.</span>
          <span className="lv-start__cta">Start now →</span>
        </Link>
        <Link href={`/dashboard/live/new?mode=schedule${q}`} className="lv-start__card">
          <span className="lv-start__icon" aria-hidden="true">🗓️</span>
          <span className="lv-start__t">Schedule a Live</span>
          <span className="lv-start__d">Pick a date and time; we&apos;ll send invitations and reminders automatically.</span>
          <span className="lv-start__cta">Schedule →</span>
        </Link>
      </div>

      {occasion && <p className="lv-hint">Your Live will be linked to <strong>{occasion.title}</strong>.</p>}

      <p className="lv-quicklinks"><Link href="/dashboard/live/contacts" className="lv-quicklink">👪 My Magical Family — saved contacts</Link></p>


      <section className="sec">
        <div className="sec__h"><h2 className="sec__t">My live rooms</h2></div>
        {rooms.length === 0 ? (
          <p className="lv-empty">No Lives yet. Choose <strong>Go Live Now</strong> or <strong>Schedule a Live</strong> above, or use the Go Live button on any occasion.</p>
        ) : (
          <div className="lv-list">
            {rooms.map((r) => {
              const meta = LIVE_STATUS[r.status];
              return (
                <Link key={r.id} href={`/dashboard/live/${r.id}/invite`} className="lv-row">
                  <span className="lv-row__main">
                    <span className="lv-row__title">{r.title}</span>
                    <span className="lv-row__meta">{r.scheduledStart ? `Scheduled ${new Date(r.scheduledStart).toLocaleString()}` : `Created ${new Date(r.createdAt).toLocaleDateString()}`}</span>
                  </span>
                  <span className={`lv-badge lv-badge--${meta.tone}`}>{meta.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
