"use client";

import { useEffect } from "react";
import Link from "next/link";

// Client error boundary for everything under /dashboard (Next.js requires
// error.tsx to be a client component). Catches a render/server-component
// error anywhere in this route's tree so one broken section shows a
// branded, safe message instead of the whole page (or the whole app)
// crashing. Never shows the error's message, stack, or any DB/API detail
// to the member — only Next's own `digest` (a short, non-sensitive
// reference id Next.js itself generates for this purpose) so a real
// support conversation has something concrete to look up. The real error
// is only ever logged server-side, same safe pattern already used in
// auth-session.ts's currentAccount() (console.error, never re-thrown to
// the client).
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[dashboard error boundary]", error);
  }, [error]);

  return (
    <div className="mm-error" role="alert">
      <span className="mm-error__icon" aria-hidden="true">✦</span>
      <h2 className="mm-error__title">This section couldn&apos;t load</h2>
      <p className="mm-error__body">
        Something went wrong loading this part of Magical Moments. It&apos;s on our side, not something you did —
        try again, or head back to your dashboard.
      </p>
      {error.digest && <p className="mm-error__digest">Reference: {error.digest}</p>}
      <div className="mm-error__actions">
        <button type="button" className="btn btn--sm" onClick={() => reset()}>Retry</button>
        <Link href="/dashboard" className="btn btn--sm btn--ghost">Go to Dashboard</Link>
      </div>
    </div>
  );
}
