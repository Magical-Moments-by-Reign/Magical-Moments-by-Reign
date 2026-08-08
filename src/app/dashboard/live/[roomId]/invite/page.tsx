import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/guard";
import { getOwnedRoom } from "@/lib/live/rooms";
import { listInvites, countInvites } from "@/lib/live/invites";
import { listReusableGuests } from "@/lib/live/guest-sources";
import { emailConfigured, smsConfigured, siteBaseUrl, whenTextFor } from "@/lib/live/invite-delivery";
import { recordingConfigured } from "@/lib/live/recording";
import { INVITE_STATUS } from "@/lib/live/invite-core";
import { agoraConfigured } from "@/lib/live/agora";
import CopyField from "@/components/live/CopyField";
import { addInvitesAction, resendInviteAction, revokeInviteAction, sendReminderAction, startLiveAction } from "../../actions";
import "../../live.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Invite your Magical Family", robots: { index: false } };

export default async function InvitePage({ params }: { params: Promise<{ roomId: string }> }) {
  const account = await requireAccount("/dashboard/live");
  const { roomId } = await params;
  const room = await getOwnedRoom(account.id, roomId);
  if (!room) notFound();

  const [invites, groups] = await Promise.all([
    listInvites(account.id, roomId),
    listReusableGuests(account.id, roomId),
  ]);
  const counts = countInvites(invites);
  const emailOk = emailConfigured();
  const smsOk = smsConfigured();
  const whenText = whenTextFor(room);
  const roomLink = `${siteBaseUrl()}/live/${room.id}?invite=${room.inviteCode}`;
  const isScheduled = room.status === "SCHEDULED";

  return (
    <div className="lv-page">
      <div className="pg-head">
        <Link href="/dashboard/live" className="cx-back">← Magical Live</Link>
        <span className="pg-eyebrow">✦ Invite your Magical Family</span>
        <h1 className="pg-title">{room.title}</h1>
        <p className="pg-sub">{whenText ? `Scheduled for ${whenText}.` : "Ready to go live."} Add your guests below — Magical Moments sends every invitation for you. No copying links, no separate emails or texts.</p>
      </div>

      {/* Honest delivery status */}
      {!emailOk && (
        <div className="lv-note lv-note--warn">Email invitations aren&apos;t connected yet (needs the email provider configured on the server). You can add guests now; invitations will send once email is connected. You can also copy the secure link below to share yourself.</div>
      )}
      {!smsOk && (
        <div className="lv-note">Text-message (SMS) invitations aren&apos;t connected yet, so guests added by mobile number won&apos;t receive a text automatically. Email invitations {emailOk ? "are sent right away" : "will send once email is connected"}, and you can always copy the secure link to share.</div>
      )}

      {/* Add guests */}
      <section className="sec">
        <div className="sec__h"><h2 className="sec__t">Add guests</h2></div>
        <form action={addInvitesAction} className="lv-invite-form">
          <input type="hidden" name="roomId" value={room.id} />

          <div className="lv-fieldrow">
            <label className="lv-field"><span>Name (optional)</span><input name="name" placeholder="Aunt May" /></label>
            <label className="lv-field"><span>Email address</span><input name="email" type="email" placeholder="guest@email.com" /></label>
            <label className="lv-field"><span>Mobile number</span><input name="phone" placeholder="(305) 555-0142" /></label>
          </div>

          <label className="lv-field"><span>Or paste many at once</span>
            <textarea name="paste" rows={3} placeholder="Paste emails and mobile numbers separated by commas, spaces, or new lines." />
          </label>

          {groups.length > 0 && (
            <div className="lv-reuse">
              <p className="lv-reuse__intro">Or choose from people you already have — no need to type them again:</p>
              {groups.map((g) => (
                <details key={g.id} className="lv-reuse__group" open>
                  <summary>{g.label} <span className="lv-reuse__hint">· {g.people.length} · {g.hint}</span></summary>
                  <div className="lv-reuse__list">
                    {g.people.map((p, i) => (
                      <label key={`${g.id}-${i}`} className="lv-reuse__item">
                        <input type="checkbox" name="sel" value={JSON.stringify({ name: p.name, email: p.email, phone: p.phone })} />
                        <span>{p.name || p.email || p.phone}</span>
                        <span className="lv-reuse__contact">{p.email || p.phone}</span>
                      </label>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}

          <div className="lv-form__actions">
            <button type="submit" className="btn btn--gold">Add &amp; send invitations</button>
          </div>
        </form>
      </section>

      {/* Secure link to share manually */}
      <section className="sec">
        <div className="sec__h"><h2 className="sec__t">Secure invite link</h2></div>
        <p className="lv-hint">This is a private Magical Moments link — guests never see any technical meeting details. Share it yourself if you like; it opens the Live in any web browser, no download or account needed.</p>
        <CopyField value={roomLink} />
      </section>

      {/* Host dashboard */}
      <section className="sec">
        <div className="sec__h"><h2 className="sec__t">Guest list</h2></div>
        <div className="lv-stats">
          <span className="lv-stat"><b>{counts.invited}</b> Invited</span>
          <span className="lv-stat"><b>{counts.sent}</b> Sent</span>
          <span className="lv-stat"><b>{counts.delivered}</b> Delivered</span>
          <span className="lv-stat"><b>{counts.opened}</b> Opened</span>
          <span className="lv-stat"><b>{counts.joined}</b> Joined</span>
          {counts.declined > 0 && <span className="lv-stat"><b>{counts.declined}</b> Declined</span>}
        </div>
        <p className="lv-microcopy">Delivered &amp; Opened populate when the email provider reports them; until those webhooks are connected they stay at zero rather than guess.</p>

        {invites.length === 0 ? (
          <p className="lv-empty">No guests yet. Add your family above and we&apos;ll send the invitations.</p>
        ) : (
          <div className="lv-guests">
            {invites.map((inv) => {
              const meta = INVITE_STATUS[inv.status];
              return (
                <div key={inv.id} className="lv-guest">
                  <span className="lv-guest__main">
                    <span className="lv-guest__name">{inv.name || inv.email || inv.phone}</span>
                    <span className="lv-guest__contact">{inv.email || inv.phone} · {inv.channel === "email" ? "Email" : "Text"}</span>
                    {inv.lastError && <span className="lv-guest__err">{inv.lastError === "sms_not_connected" ? "SMS not connected — not sent" : inv.lastError === "email_not_connected" ? "Email not connected — not sent" : "Not delivered"}</span>}
                  </span>
                  <span className={`lv-badge lv-badge--${meta.tone}`}>{meta.label}</span>
                  <span className="lv-guest__actions">
                    {inv.status !== "REVOKED" && (
                      <form action={resendInviteAction}>
                        <input type="hidden" name="roomId" value={room.id} />
                        <input type="hidden" name="inviteId" value={inv.id} />
                        <button type="submit" className="btn btn--ghost btn--sm">Resend</button>
                      </form>
                    )}
                    {inv.status !== "REVOKED" && (
                      <form action={revokeInviteAction}>
                        <input type="hidden" name="roomId" value={room.id} />
                        <input type="hidden" name="inviteId" value={inv.id} />
                        <button type="submit" className="btn btn--warn btn--sm">Remove</button>
                      </form>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Reminders */}
      {isScheduled && invites.length > 0 && (
        <section className="sec">
          <div className="sec__h"><h2 className="sec__t">Reminders</h2></div>
          <p className="lv-hint">For scheduled Lives, reminders send automatically over each guest&apos;s invitation channel. You can also send one now:</p>
          <div className="lv-form__actions">
            {(["t24h", "t1h", "liveNow"] as const).map((k) => (
              <form key={k} action={sendReminderAction}>
                <input type="hidden" name="roomId" value={room.id} />
                <input type="hidden" name="kind" value={k} />
                <button type="submit" className="btn btn--ghost btn--sm">{k === "t24h" ? "Send 24-hour reminder" : k === "t1h" ? "Send 1-hour reminder" : "Send “Live now”"}</button>
              </form>
            ))}
          </div>
        </section>
      )}

      {/* Go live / enter */}
      <section className="sec">
        <div className="sec__h"><h2 className="sec__t">{isScheduled ? "Start the Live" : "Enter the Live"}</h2></div>
        <div className="lv-form__actions">
          {isScheduled ? (
            <form action={startLiveAction}>
              <input type="hidden" name="roomId" value={room.id} />
              <button type="submit" className="btn btn--gold" disabled={!agoraConfigured()}>Start the Live now →</button>
            </form>
          ) : (
            <Link href={`/live/${room.id}`} className="btn btn--gold">Enter the room →</Link>
          )}
          <Link href={`/live/${room.id}`} className="btn btn--ghost">Open host studio</Link>
        </div>
        {!agoraConfigured() && <p className="lv-microcopy">Starting the Live becomes available once the Agora keys are configured on the server.</p>}
      </section>

      {/* Replay — honest gating */}
      <section className="sec">
        <div className="sec__h"><h2 className="sec__t">Replay</h2></div>
        {recordingConfigured() ? (
          <p className="lv-hint">After the Live ends, you&apos;ll be able to send “The replay is ready” to everyone you invited.</p>
        ) : (
          <p className="lv-microcopy">Replay isn&apos;t connected yet. Once cloud recording is enabled, you&apos;ll be able to send a real replay link to your guests — we&apos;ll never send a replay that doesn&apos;t exist.</p>
        )}
      </section>
    </div>
  );
}
