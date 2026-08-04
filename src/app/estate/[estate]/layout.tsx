import { requireAccount } from "@/lib/guard";
import "./estate.css";

export const dynamic = "force-dynamic";

// A Life Estate is an ARRIVAL, not an application shell. The cinematic top bar
// floats over each page's own hero, so the layout stays minimal — just the
// warm ivory ground and server-side auth enforcement.
export default async function EstateLayout({ children }: { children: React.ReactNode }) {
  await requireAccount("/home");
  return <div className="estate-shell">{children}</div>;
}
