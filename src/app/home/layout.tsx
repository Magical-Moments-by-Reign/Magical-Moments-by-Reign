import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { unreadCount } from "@/lib/notify";
import { logoutAction } from "../account/actions";
import "./home.css";

export const dynamic = "force-dynamic";

// The front door. A calm, warm shell — NOT a settings console. Account &
// settings live one quiet link away; Home is for what matters in life today.
export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  const account = await requireAccount("/home");
  const unread = await unreadCount(account.id);

  return (
    <div className="home">
      <header className="home__bar">
        <Link href="/home" className="home__brand" aria-label="Magical Moments — home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-mark.png" alt="" width={34} height={34} />
          <span>Magical Moments</span>
        </Link>
        <nav className="home__bar-right" aria-label="Account">
          <Link href="/notifications" className="bell" aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}>
            🔔{unread > 0 && <span className="bell__count">{unread > 99 ? "99+" : unread}</span>}
          </Link>
          <Link href="/account" className="home__acctlink">Account &amp; settings</Link>
          <form action={logoutAction}>
            <button type="submit" className="home__signout">Sign out</button>
          </form>
        </nav>
      </header>
      <main className="home__main">{children}</main>
    </div>
  );
}
