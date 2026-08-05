import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/guard";
import { canCreateOccasions } from "@/lib/membership-access";
import { EXPERIENCES } from "@/lib/membership-builder";
import CreateMomentForm from "./CreateMomentForm";
import "./create.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create a Moment", robots: { index: false } };

export default async function CreateMomentPage() {
  const account = await requireAccount("/dashboard/create");
  const allowed = canCreateOccasions(account.membershipTier);
  const journeys = EXPERIENCES.map((e) => ({ id: e.id, label: e.label, milestones: e.milestones }));

  return (
    <>
      <div className="pg-head">
        <span className="pg-eyebrow">Create</span>
        <h1 className="pg-title">Create a Moment</h1>
        <p className="pg-sub">Choose a Journey, name your Moment, and we&rsquo;ll set up a beautiful draft you can build from.</p>
      </div>

      {allowed ? (
        <div className="card" style={{ maxWidth: 620 }}>
          <CreateMomentForm journeys={journeys} />
        </div>
      ) : (
        <div className="empty">
          <div className="empty__mark"><svg viewBox="0 0 24 24"><path d="M12 3 L14.5 9 L21 9.5 L16 13.8 L17.5 20 L12 16.6 L6.5 20 L8 13.8 L3 9.5 L9.5 9 Z" /></svg></div>
          <p className="empty__t">Creating Moments is a Membership feature</p>
          <p className="empty__s">Free Forever is a beautiful introduction. Upgrade to a Magical Moments Membership to begin creating and reserving your Journeys.</p>
          <Link href="/membership" className="btn btn--gold">View Memberships</Link>
        </div>
      )}
    </>
  );
}
