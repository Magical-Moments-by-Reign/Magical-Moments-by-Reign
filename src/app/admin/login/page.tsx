import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SiteNav from "@/components/site/SiteNav";
import { adminLoginAction } from "../actions";
import { isAdmin, adminPassword } from "@/lib/admin-auth";
import "../admin.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin sign in", robots: { index: false } };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const dest = next || "/admin/custom-websites";
  if (await isAdmin()) redirect(dest);
  const configured = Boolean(adminPassword());

  return (
    <div className="adm">
      <SiteNav />
      <main className="container adm-auth">
        <div className="adm-auth__card">
          <span className="eyebrow" style={{ color: "var(--gold-deep)" }}>Admin</span>
          <h1>Sign in</h1>
          {!configured ? (
            <p className="adm-auth__warn">
              The admin area is not configured yet. Set an <code>ADMIN_PASSWORD</code>
              environment variable to enable it.
            </p>
          ) : (
            <form action={adminLoginAction} className="adm-auth__form">
              {error && <div className="adm-error">Incorrect password. Please try again.</div>}
              <input type="hidden" name="next" value={dest} />
              <label className="adm-field">
                <span>Password</span>
                <input name="password" type="password" required autoFocus autoComplete="current-password" />
              </label>
              <button type="submit" className="btn-gold">Sign in</button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
