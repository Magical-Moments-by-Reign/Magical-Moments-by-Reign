"use client";

// Opens the Concierge chat from anywhere in the dashboard by dispatching the
// window event the ConciergeChat listens for. Optional seed pre-fills the input.
export default function OpenConciergeButton({
  children, className, seed,
}: { children: React.ReactNode; className?: string; seed?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new CustomEvent("mmr:open-concierge", { detail: seed ? { seed } : undefined }))}
    >
      {children}
    </button>
  );
}
