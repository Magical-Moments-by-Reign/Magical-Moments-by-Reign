import Link from "next/link";

/** Minimal branded chrome for the authentication pages. */
export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth">
      <div className="auth__top">
        <Link href="/" className="auth__brand" aria-label="Magical Moments by Reign — home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-mark.png" alt="" width={46} height={46} />
          <span>
            <span className="auth__brand-name">Magical Moments</span>
            <br />
            <span className="auth__brand-sub">by reign</span>
          </span>
        </Link>
      </div>
      <main className="auth__main">{children}</main>
    </div>
  );
}
