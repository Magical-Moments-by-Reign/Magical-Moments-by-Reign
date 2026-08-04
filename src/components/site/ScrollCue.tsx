// A gentle "Scroll" cue — a bobbing champagne chevron that tells visitors
// there's more below. Decorative (aria-hidden); honors reduced-motion via CSS.
export default function ScrollCue({ label = "Scroll" }: { label?: string }) {
  return (
    <div className="mm-cue" aria-hidden="true">
      <span>{label}</span>
      <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
    </div>
  );
}
