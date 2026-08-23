"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Real browser history in a same-tab session, tracked with one small
// counter this component itself owns — not document.referrer (which
// doesn't update across Next's client-side navigations, only real page
// loads) and not history.length alone (which also counts entries from
// before this app was ever opened). Every Sports page in the current tab
// increments this once on mount; a Back link only offers to go back when
// a REAL previous Sports-app page exists in this tab's session — the
// first Sports page a member lands on always falls back to fallbackHref.
const NAV_DEPTH_KEY = "spx-nav-depth";

export default function SmartBackLink({
  fallbackHref,
  label,
  className,
  style,
}: {
  fallbackHref: string;
  label: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    try {
      const depth = Number(sessionStorage.getItem(NAV_DEPTH_KEY) ?? "0");
      setCanGoBack(depth > 0 && window.history.length > 1);
      sessionStorage.setItem(NAV_DEPTH_KEY, String(depth + 1));
    } catch {
      // sessionStorage unavailable (private browsing, etc.) — canGoBack
      // simply stays false and the link uses its real fallback href.
    }
  }, []);

  return (
    <a
      href={fallbackHref}
      className={className}
      style={style}
      onClick={(e) => {
        if (canGoBack) {
          e.preventDefault();
          router.back();
        }
      }}
    >
      {label}
    </a>
  );
}
