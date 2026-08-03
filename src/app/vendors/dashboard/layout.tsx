import Link from "next/link";
import { requireVendor } from "@/lib/vendor-auth";
import VendorNav from "@/components/vendor/VendorNav";
import { logoutAction } from "../../account/actions";
import "../../auth.css";

export const dynamic = "force-dynamic";

export default async function VendorDashboardLayout({ children }: { children: React.ReactNode }) {
  // Server-side enforcement (middleware only redirects; this validates the
  // session + vendor role against the DB and links the vendor record).
  const ctx = await requireVendor("/vendors/dashboard");

  return (
    <div className="acct">
      <header className="acct__bar">
        <Link href="/" className="acct__bar-brand" aria-label="Magical Moments by Reign — home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-mark.png" alt="" width={34} height={34} />
          <span>Vendor Portal</span>
        </Link>
        <div className="acct__bar-right">
          <span style={{ opacity: 0.85, fontSize: "0.9rem" }}>{ctx.account.firstName}</span>
          <form action={logoutAction}>
            <button type="submit" style={{ background: "none", border: "1px solid rgba(246,239,226,0.4)", color: "#f6efe2", borderRadius: 999, padding: "0.4rem 0.9rem", cursor: "pointer", fontSize: "0.85rem" }}>Sign out</button>
          </form>
        </div>
      </header>
      <div className="acct__wrap">
        <VendorNav />
        <div className="acct__panel">{children}</div>
      </div>
    </div>
  );
}
