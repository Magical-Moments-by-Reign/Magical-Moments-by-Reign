import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { canCreateOccasions } from "@/lib/membership-access";
import { EXPERIENCES } from "@/lib/membership-builder";
import CreateExperience from "./CreateExperience";
import "./create.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Welcome to Magical Moments", robots: { index: false } };

// Every memory begins the same way — no member lands directly on a planning
// form. CreateExperience asks the one question first (Capture vs Create) and
// branches from there. Membership still gates actually creating a memory.
export default async function CreateMomentPage() {
  const account = await requireAccount("/dashboard/create");
  const allowed = canCreateOccasions(account.membershipTier);
  const journeys = EXPERIENCES.map((e) => ({ id: e.id, label: e.label, milestones: e.milestones }));

  if (!allowed) {
    return (
      <div className="empty">
        <div className="empty__mark"><svg viewBox="0 0 24 24"><path d="M12 3 L14.5 9 L21 9.5 L16 13.8 L17.5 20 L12 16.6 L6.5 20 L8 13.8 L3 9.5 L9.5 9 Z" /></svg></div>
        <p className="empty__t">Capturing &amp; creating Memories is a Membership feature</p>
        <p className="empty__s">Free Forever is a beautiful introduction. Upgrade to a Magical Moments Membership to begin capturing and creating your Memories.</p>
        <Link href="/membership" className="btn btn--gold">View Memberships</Link>
      </div>
    );
  }

  return <CreateExperience journeys={journeys} />;
}
