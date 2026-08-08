import { redirect } from "next/navigation";

// The Concierge & Reservations hub has been absorbed into Luxury Services —
// the single Magical Moments premium marketplace. Old links land there.
export const dynamic = "force-dynamic";

export default function ConciergeRedirect() {
  redirect("/dashboard/luxury-services");
}
