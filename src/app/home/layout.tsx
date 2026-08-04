import { requireAccount } from "@/lib/guard";
import "./home.css";

export const dynamic = "force-dynamic";

// Your Magical Space — the member's arrival. A full-bleed estate landing, not a
// console: the working navigation lives in the Dashboard the hero leads into.
// The shell stays minimal (auth + ivory ground); the page renders its own
// floating header over the living hero.
export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  await requireAccount("/home");
  return <div className="mspace-shell">{children}</div>;
}
