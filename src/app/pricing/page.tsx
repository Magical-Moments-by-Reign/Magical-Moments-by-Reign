import { redirect } from "next/navigation";

// Pricing and membership now live together in one place — the Membership
// Builder — so members see everything without hopping between pages.
export default function PricingPage() {
  redirect("/membership");
}
