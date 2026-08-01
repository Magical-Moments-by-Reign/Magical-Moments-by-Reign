// Official platform glyphs (inline SVG, currentColor). Kept simple and
// recognizable; brand colors are applied by the card, not baked in.

const PATHS: Record<string, React.ReactNode> = {
  instagram: (
    <>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" ry="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.4" cy="6.6" r="1.3" fill="currentColor" />
    </>
  ),
  facebook: (
    <path fill="currentColor" d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
  ),
  tiktok: (
    <path fill="currentColor" d="M16.5 3c.3 2.2 1.6 3.7 3.8 3.9v2.6c-1.3.1-2.5-.3-3.8-1v5.7c0 4.3-3.5 6.6-6.9 5.4C6 18.4 5.4 13.8 8.4 12c.9-.5 1.9-.7 3-.6v2.7c-.5-.1-1-.1-1.5.1-1 .4-1.4 1.4-1.1 2.4.5 1.6 2.9 1.6 3.4-.1.1-.4.1-.8.1-1.2V3h4.2z" />
  ),
  youtube: (
    <>
      <path fill="currentColor" d="M23 12s0-3.2-.4-4.7a2.5 2.5 0 0 0-1.7-1.8C19.3 5 12 5 12 5s-7.3 0-8.9.5A2.5 2.5 0 0 0 1.4 7.3C1 8.8 1 12 1 12s0 3.2.4 4.7a2.5 2.5 0 0 0 1.7 1.8C4.7 19 12 19 12 19s7.3 0 8.9-.5a2.5 2.5 0 0 0 1.7-1.8C23 15.2 23 12 23 12z" />
      <path fill="#fff" d="M9.8 15.3V8.7l5.7 3.3-5.7 3.3z" />
    </>
  ),
  pinterest: (
    <path fill="currentColor" d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.5 1.9-2.5.9 0 1.3.7 1.3 1.5 0 .9-.6 2.2-.9 3.5-.2 1 .5 1.9 1.5 1.9 1.9 0 3.2-2.4 3.2-5.2 0-2.2-1.5-3.8-4.1-3.8a4.7 4.7 0 0 0-4.9 4.7c0 .9.3 1.5.7 2 .2.2.2.3.1.6l-.2.9c-.1.3-.3.4-.6.2-1.2-.5-1.8-1.9-1.8-3.5C5.7 8.3 8 5.6 12.2 5.6c3.4 0 5.7 2.4 5.7 5.1 0 3.5-1.9 6-4.8 6-1 0-1.9-.5-2.2-1.1l-.6 2.3c-.2.8-.7 1.7-1.1 2.3A10 10 0 1 0 12 2z" />
  ),
  linkedin: (
    <path fill="currentColor" d="M20.4 3H3.6A.6.6 0 0 0 3 3.6v16.8a.6.6 0 0 0 .6.6h16.8a.6.6 0 0 0 .6-.6V3.6a.6.6 0 0 0-.6-.6zM8.3 18.3H5.4V9.7h2.9v8.6zM6.9 8.4a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4zm11.4 9.9h-2.9v-4.2c0-1 0-2.3-1.4-2.3s-1.6 1.1-1.6 2.2v4.3H9.5V9.7h2.8v1.2h.04c.4-.7 1.3-1.4 2.7-1.4 2.9 0 3.4 1.9 3.4 4.3v4.5z" />
  ),
  x: (
    <path fill="currentColor" d="M17.5 3h3l-6.6 7.6L21.7 21h-5.9l-4.6-6-5.3 6H3l7-8.1L2.6 3h6l4.1 5.5L17.5 3zm-1 16h1.6L7.6 4.7H5.9L16.5 19z" />
  ),
};

export default function PlatformLogo({ id, size = 26 }: { id: string; size?: number }) {
  const path = PATHS[id];
  if (!path) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" role="img">
      {path}
    </svg>
  );
}
