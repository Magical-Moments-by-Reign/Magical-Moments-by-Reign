import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { unreadCount } from "@/lib/notify";
import AccountNav from "@/components/account/AccountNav";
import { logoutAction } from "./actions";
import "../auth.css";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  // Server-side enforcement (the middleware only redirects; this validates).
  const account = await requireAccount("/account");
  const unread = await unreadCount(account.id);

  return (
    <div className="acct">
      <header className="acct__bar">
        <Link href="/" className="acct__bar-brand" aria-label="Magical Moments by Reign — home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-mark.png" alt="" width={34} height={34} />
          <span>Magical Moments</span>
        </Link>
        <div className="acct__bar-right">
          <Link href="/notifications" className="bell" aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}>
            🔔{unread > 0 && <span className="bell__count">{unread > 99 ? "99+" : unread}</span>}
          </Link>
          <span style={{ opacity: 0.85, fontSize: "0.9rem" }}>Hi, {account.firstName}</span>
          <form action={logoutAction}>
            <button type="submit" style={{ background: "none", border: "1px solid rgba(246,239,226,0.4)", color: "#f6efe2", borderRadius: 999, padding: "0.4rem 0.9rem", cursor: "pointer", fontSize: "0.85rem" }}>
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div className="acct__wrap">
        <AccountNav />
        <div className="acct__panel">{children}</div>
      </div>
    </div>
  );
}
