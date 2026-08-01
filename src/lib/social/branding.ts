// ── Platform branding (gradients + coming-soon roster) ──────────
// Visual only. The connectable platforms + their API rules live in
// platforms.ts; this adds official-feeling gradients and the
// "coming soon" platforms we display but don't yet connect.

export const PLATFORM_GRADIENT: Record<string, string> = {
  instagram: "linear-gradient(135deg, #feda75, #fa7e1e 35%, #d62976 65%, #962fbf 90%)",
  facebook: "linear-gradient(135deg, #1877f2, #0a5bd6)",
  tiktok: "linear-gradient(135deg, #25f4ee 5%, #010101 45%, #fe2c55 95%)",
  youtube: "linear-gradient(135deg, #ff4e45, #ff0000 60%, #cc0000)",
  pinterest: "linear-gradient(135deg, #ff5566, #e60023 70%, #bd081c)",
  linkedin: "linear-gradient(135deg, #2a9df4, #0a66c2 70%, #004182)",
  x: "linear-gradient(135deg, #3a3a3a, #000)",
};

export interface ComingSoonPlatform {
  id: string;
  label: string;
  note: string;
}

export const COMING_SOON: ComingSoonPlatform[] = [
  { id: "pinterest", label: "Pinterest", note: "Pin your moments to boards — arriving soon." },
  { id: "linkedin", label: "LinkedIn", note: "Share milestones with your network — arriving soon." },
  { id: "x", label: "X", note: "Post updates to X — arriving soon." },
];
