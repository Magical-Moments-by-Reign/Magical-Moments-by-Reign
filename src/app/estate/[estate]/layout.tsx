import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { unreadCount } from "@/lib/notify";
import HomeSidebar from "@/components/home/HomeSidebar";
import { logoutAction } from "../../account/actions";
import "../../home/home.css";
import "./estate.css";

export const dynamic = "force-dynamic";

// An Estate renders inside the SAME Magical Space shell as the member Home —
// so entering an Estate feels like walking into another elegant wing of the
// same home, never a separate website (framework §6, luxury constitution).
export default async function EstateLayout({ children }: { children: React.ReactNode }) {
  const account = await requireAccount("/home");
  const [unread, data] = await Promise.all([
    unreadCount(account.id),
    prisma.account.findUnique({ where: { id: account.id }, select: { createdAt: true } }),
  ]);
  const since = data?.createdAt
    ? data.createdAt.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "—";
  const initial = (account.firstName?.[0] ?? "M").toUpperCase();

  return (
    <div className="home">
      <HomeSidebar memberSince={since} />
      <div className="home__body">
        <div className="home__top">
          <Link href="/notifications" className="bell" aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}>
            🔔{unread > 0 && <span className="bell__count">{unread > 99 ? "99+" : unread}</span>}
          </Link>
          <Link href="/account" className="home__me">
            <span className="home__me-txt">
              <span className="home__me-name">{account.firstName} {account.lastName}</span>
              <span className="home__me-tier">Account &amp; settings</span>
            </span>
            <span className="home__me-avatar" aria-hidden="true">{initial}</span>
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="home__signout">Sign out</button>
          </form>
        </div>
        {children}
      </div>
    </div>
  );
}
