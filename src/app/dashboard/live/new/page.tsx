import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { createLiveAction } from "../actions";
import "../live.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create a Magical Live", robots: { index: false } };

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Phoenix",
  "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu",
  "America/Toronto", "Europe/London", "Europe/Paris", "UTC",
];

export default async function NewLivePage({ searchParams }: { searchParams: Promise<{ mode?: string; slug?: string }> }) {
  const account = await requireAccount("/dashboard/live");
  const { mode: rawMode, slug } = await searchParams;
  const mode = rawMode === "schedule" ? "schedule" : "now";

  const [occasions, current] = await Promise.all([
    prisma.experience.findMany({ where: { accountId: account.id }, select: { id: true, title: true, slug: true }, orderBy: { updatedAt: "desc" }, take: 100 }),
    slug ? prisma.experience.findFirst({ where: { slug, accountId: account.id }, select: { id: true, title: true } }) : null,
  ]);

  return (
    <div className="lv-page">
      <div className="pg-head">
        <Link href="/dashboard/live" className="cx-back">← Magical Live</Link>
        <span className="pg-eyebrow">✦ {mode === "schedule" ? "Schedule a Live" : "Go Live Now"}</span>
        <h1 className="pg-title">{mode === "schedule" ? "Schedule a Magical Live" : "Go Live now"}</h1>
        <p className="pg-sub">{mode === "schedule"
          ? "Set the moment and we'll create a secure room, send the invitations, and remind everyone — no work for your family."
          : "We'll create a secure room and take you straight to inviting your Magical Family."}</p>
      </div>

      <form action={createLiveAction} className="lv-form lv-form--card">
        <input type="hidden" name="mode" value={mode} />

        <label className="lv-field"><span>Live title</span>
          <input name="title" required placeholder={current ? `${current.title} — Live` : "e.g. Nana's 80th Birthday — Live"} defaultValue={current ? `${current.title} — Live` : ""} />
        </label>

        <label className="lv-field"><span>Occasion</span>
          <select name="experienceId" defaultValue={current?.id ?? ""}>
            <option value="">No specific occasion</option>
            {occasions.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
          </select>
        </label>

        <label className="lv-field"><span>Host / family name (shown on the invitation)</span>
          <input name="hostName" placeholder="e.g. The Thompson Family" defaultValue={[account.firstName, account.lastName].filter(Boolean).join(" ")} />
        </label>

        <label className="lv-field"><span>Message to guests (optional)</span>
          <textarea name="eventMessage" rows={2} placeholder="A short note that appears in the invitation." />
        </label>

        {mode === "schedule" && (
          <div className="lv-fieldrow">
            <label className="lv-field"><span>Date &amp; start time</span>
              <input name="startAt" type="datetime-local" required />
            </label>
            <label className="lv-field"><span>Time zone</span>
              <select name="timezone" defaultValue="America/New_York">
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>)}
              </select>
            </label>
          </div>
        )}

        <fieldset className="lv-fieldset">
          <legend>Privacy</legend>
          <label className="lv-radio"><input type="radio" name="visibility" value="private" defaultChecked /> Invite-only (recommended) — only people you invite can join</label>
          <label className="lv-radio"><input type="radio" name="visibility" value="unlisted" /> Unlisted — anyone with the secure link can join</label>
          <label className="lv-check"><input type="checkbox" name="requireName" /> Ask each guest for their name before joining</label>
          <label className="lv-field lv-field--inline"><span>Passcode (optional)</span>
            <input name="passcode" placeholder="Leave blank for none" />
          </label>
        </fieldset>

        <fieldset className="lv-fieldset">
          <legend>During the Live</legend>
          <label className="lv-check"><input type="checkbox" name="allowChat" defaultChecked /> Allow chat</label>
          <label className="lv-check"><input type="checkbox" name="allowReactions" defaultChecked /> Allow reactions</label>
          <label className="lv-check"><input type="checkbox" name="allowScreenShare" defaultChecked /> Allow screen sharing (host)</label>
        </fieldset>

        {mode === "schedule" && (
          <fieldset className="lv-fieldset">
            <legend>Reminders (sent automatically)</legend>
            <label className="lv-check"><input type="checkbox" name="remind24h" defaultChecked /> 24 hours before</label>
            <label className="lv-check"><input type="checkbox" name="remind1h" defaultChecked /> 1 hour before</label>
            <label className="lv-check"><input type="checkbox" name="remindLiveNow" defaultChecked /> When the Live begins</label>
          </fieldset>
        )}

        <div className="lv-form__actions">
          <button type="submit" className="btn btn--gold">{mode === "schedule" ? "Schedule & invite guests →" : "Create room & invite guests →"}</button>
          <Link href="/dashboard/live" className="btn btn--ghost">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
