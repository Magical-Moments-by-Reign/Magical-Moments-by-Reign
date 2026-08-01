import Link from "next/link";
import SiteNav from "@/components/site/SiteNav";
import { getCurrentUserId } from "@/lib/session";
import { listConnections, realOAuthEnabled } from "@/lib/social/connections";
import { PLATFORMS, type PlatformId } from "@/lib/social/platforms";
import { PLATFORM_GRADIENT, COMING_SOON } from "@/lib/social/branding";
import PlatformLogo from "@/components/social/PlatformLogo";
import {
  beginConnectAction,
  disconnectAction,
  reconnectAction,
  expireAction,
} from "./actions";
import "./social.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Magical Social Studio" };

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default async function SocialStudioPage() {
  const userId = await getCurrentUserId();
  const connections = await listConnections(userId);
  const byPlatform = new Map(connections.map((c) => [c.platform, c]));
  const anyLive = PLATFORMS.some((p) => realOAuthEnabled(p.id));

  return (
    <div className="ss">
      <SiteNav />
      <header className="ss-header">
        <div className="container">
          <div className="ss-crumb">
            <Link href="/dashboard" className="ss-back">
              ← Dashboard
            </Link>
          </div>
          <span className="eyebrow">Magical Social Studio</span>
          <h1>Connect &amp; share your moments</h1>
          <p>
            Connect your social accounts, then share photos, videos,
            announcements, invitations, and journey updates — beautifully
            optimized for each platform — right from your dashboard.
          </p>
        </div>
      </header>

      <main className="ss-main">
        <div className="container">
          {/* Security assurance */}
          <div className="ss-secure">
            <div className="ss-secure__icon" aria-hidden="true">
              🔒
            </div>
            <div>
              <h3>Your passwords stay yours</h3>
              <p>
                You never enter a social password into Magical Moments. We
                connect through each platform&apos;s official authorization, store
                your access securely and encrypted, and let you disconnect any
                account at any time.
              </p>
            </div>
          </div>

          {!anyLive && (
            <div className="ss-sandbox">
              <b>Sandbox mode.</b> Live platform credentials aren&apos;t configured
              in this environment, so connecting opens a clearly-labeled demo
              authorization instead of the real platform screen. The security
              model, encrypted token storage, and full workflow are real — only
              the external handshake is simulated.
            </div>
          )}

          {/* Connections */}
          <h2 className="ss-section-title">Your accounts</h2>
          <div className="ss-grid">
            {PLATFORMS.map((p) => {
              const conn = byPlatform.get(p.id);
              return (
                <ConnectionCard key={p.id} platformId={p.id} conn={conn} />
              );
            })}
            {COMING_SOON.map((p) => (
              <div className="ss-conn ss-conn--soon" key={p.id}>
                <div className="ss-conn__top">
                  <span className="ss-conn__badge" style={{ background: PLATFORM_GRADIENT[p.id] }} aria-hidden="true">
                    <PlatformLogo id={p.id} />
                  </span>
                  <div>
                    <div className="ss-conn__name">{p.label}</div>
                  </div>
                </div>
                <span className="ss-status ss-status--soon">◔ Coming soon</span>
                <div className="ss-conn__note">{p.note}</div>
                <div className="ss-conn__actions">
                  <button className="ss-btn" type="button" disabled>Coming soon</button>
                </div>
              </div>
            ))}
          </div>

          {/* Share entry */}
          <div className="ss-share-cta">
            <div>
              <h3>Share a magical update</h3>
              <p>
                Ask Magical will prepare an optimized post for each connected
                platform — caption, hashtags, cover and all — for you to review
                and approve before anything is sent.
              </p>
            </div>
            <Link href="/dashboard/social/share" className="btn-gold">
              Start a share ✦
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function ConnectionCard({
  platformId,
  conn,
}: {
  platformId: PlatformId;
  conn?: { profileName: string; status: string; connectedAt: Date };
}) {
  const p = PLATFORMS.find((x) => x.id === platformId)!;
  const status = conn?.status ?? "NONE";

  return (
    <div className={`ss-conn ss-conn--${status.toLowerCase()}`}>
      <div className="ss-conn__top">
        <span className="ss-conn__badge" style={{ background: PLATFORM_GRADIENT[p.id] ?? p.brand }} aria-hidden="true">
          <PlatformLogo id={p.id} />
        </span>
        <div>
          <div className="ss-conn__name">{p.label}</div>
          {conn && <div className="ss-conn__profile">{conn.profileName}</div>}
        </div>
      </div>

      <span className={`ss-status ss-status--${status.toLowerCase()}`}>
        {status === "CONNECTED" && "● Connected"}
        {status === "EXPIRED" && "● Connection expired"}
        {status === "NONE" && "○ Not connected"}
        {status === "DISCONNECTED" && "○ Disconnected"}
      </span>

      {conn ? (
        <div className="ss-conn__meta">Connected {fmtDate(conn.connectedAt)}</div>
      ) : (
        <div className="ss-conn__note">{p.note}</div>
      )}

      <div className="ss-conn__actions">
        {status === "CONNECTED" && (
          <>
            <form action={reconnectAction}>
              <input type="hidden" name="platform" value={p.id} />
              <button className="ss-btn" type="submit">Reconnect</button>
            </form>
            <form action={disconnectAction}>
              <input type="hidden" name="platform" value={p.id} />
              <button className="ss-btn ss-btn--danger" type="submit">Disconnect</button>
            </form>
            {/* Demo-only: preview the expired state */}
            <form action={expireAction}>
              <input type="hidden" name="platform" value={p.id} />
              <button className="ss-btn ss-btn--ghost" type="submit" title="Demo: simulate an expired connection">
                Simulate expiry
              </button>
            </form>
          </>
        )}
        {status === "EXPIRED" && (
          <>
            <form action={reconnectAction}>
              <input type="hidden" name="platform" value={p.id} />
              <button className="ss-btn ss-btn--primary" type="submit">Reconnect</button>
            </form>
            <form action={disconnectAction}>
              <input type="hidden" name="platform" value={p.id} />
              <button className="ss-btn ss-btn--danger" type="submit">Disconnect</button>
            </form>
          </>
        )}
        {(status === "NONE" || status === "DISCONNECTED") && (
          <form action={beginConnectAction}>
            <input type="hidden" name="platform" value={p.id} />
            <button className="ss-btn ss-btn--primary" type="submit">
              {p.connectLabel}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
