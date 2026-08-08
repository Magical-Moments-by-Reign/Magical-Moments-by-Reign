import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { listRooms } from "@/lib/live/rooms";
import { agoraConfigured } from "@/lib/live/agora";
import { LIVE_STATUS } from "@/lib/live/core";
import { goLiveAction } from "./actions";
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

  return (
    <div className="lv-page">
      <div className="pg-head">
        <span className="pg-eyebrow">✦ Magical Moments Live</span>
        <h1 className="pg-title">Go Live</h1>
        <p className="pg-sub">Stream any occasion to the people who matter — a private channel per event, secure invite links, host and audience modes.</p>
      </div>

      {!agoraConfigured() && (
        <div className="lv-note">Live streaming isn&apos;t fully connected yet. You can create rooms, but joining needs the Agora keys configured on the server.</div>
      )}

      <section className="sec">
        <div className="sec__h"><h2 className="sec__t">Start a live room</h2></div>
        <form action={goLiveAction} className="lv-form">
          {occasion && <input type="hidden" name="experienceId" value={occasion.id} />}
          <label className="lv-field"><span>Title</span>
            <input name="title" placeholder={occasion ? `${occasion.title} — Live` : "e.g. Nick's Birthday — Live"} defaultValue={occasion ? `${occasion.title} — Live` : ""} />
          </label>
          <label className="lv-field"><span>Scheduled start (optional)</span>
            <input name="scheduledStart" type="datetime-local" />
          </label>
          <button type="submit" className="btn btn--gold">Create room &amp; go to host studio</button>
        </form>
        {occasion && <p className="lv-hint">This room will be linked to <strong>{occasion.title}</strong>.</p>}
      </section>

      <section className="sec">
        <div className="sec__h"><h2 className="sec__t">My live rooms</h2></div>
        {rooms.length === 0 ? (
          <p className="lv-empty">No rooms yet. Create one above, or use the Go Live button on any occasion.</p>
        ) : (
          <div className="lv-list">
            {rooms.map((r) => {
              const meta = LIVE_STATUS[r.status];
              return (
                <Link key={r.id} href={`/live/${r.id}`} className="lv-row">
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
