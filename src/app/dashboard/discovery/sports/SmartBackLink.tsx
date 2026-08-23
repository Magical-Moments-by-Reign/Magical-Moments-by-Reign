"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// A real session-scoped stack of Sports pathnames this tab has actually
// visited — not a numeric counter. A counter only ever goes up, so after
// navigating around and then back out, it can keep claiming "there's a
// previous Sports page" long after browser history has actually moved
// past Sports entirely. A stack lets us name the exact page to return to,
// and only ever contains real Sports paths (every entry comes from a
// SmartBackLink mounting on an actual Sports page) — so a Back click here
// can never leave /dashboard/discovery/sports on its own.
const STACK_KEY = "spx-nav-stack";
const MAX_STACK = 25;

function readStack(): string[] {
  try {
    const raw = sessionStorage.getItem(STACK_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === "string") : [];
  } catch {
    return [];
  }
}

function writeStack(stack: string[]) {
  try {
    sessionStorage.setItem(STACK_KEY, JSON.stringify(stack.slice(-MAX_STACK)));
  } catch {
    // sessionStorage unavailable (private browsing, etc.) — every mount
    // below just falls through to "no genuine previous page", which is
    // the safe default (real fallbackHref, never a guess).
  }
}

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
  const pathname = usePathname();
  const [previous, setPrevious] = useState<string | null>(null);

  useEffect(() => {
    let stack = readStack();
    // Re-arriving at a path already on the stack — whether via this same
    // control, the browser's own Back/Forward buttons, or a reload — means
    // "we're back at a known point," so the stack truncates to there
    // instead of appending a duplicate deeper. A genuinely new Sports page
    // (reached via an ordinary link, not this control) gets appended.
    const idx = stack.lastIndexOf(pathname);
    stack = idx !== -1 ? stack.slice(0, idx + 1) : [...stack, pathname];
    writeStack(stack);
    setPrevious(stack.length >= 2 ? stack[stack.length - 2] : null);
    // pathname is the only real dependency — a fresh mount per navigation
    // is exactly what re-derives `previous` correctly each time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const target = previous ?? fallbackHref;

  return (
    <a
      href={target}
      className={className}
      style={style}
      onClick={(e) => {
        if (previous) {
          e.preventDefault();
          // Pop down to (not just toward) the confirmed previous entry
          // before navigating, so the target page's own mount sees itself
          // already at the top of the stack rather than pushing a
          // duplicate — which is what would otherwise turn one Back click
          // into a Back/Forward loop between the last two pages.
          const stack = readStack();
          const idx = stack.lastIndexOf(pathname);
          writeStack(idx !== -1 ? stack.slice(0, idx) : stack.slice(0, -1));
          router.push(previous);
        }
        // No genuine previous entry — this is a real <a href={fallbackHref}>,
        // so the browser just navigates there normally.
      }}
    >
      {label}
    </a>
  );
}
