import type { Metadata } from "next";
import Link from "next/link";
import { requireVendorSection } from "@/lib/vendor-auth";
import { prisma } from "@/lib/db";
import { VENDOR_CATEGORIES } from "@/lib/vendors";
import { saveVendorProfileAction } from "./actions";

export const metadata: Metadata = { title: "Vendor profile", robots: { index: false } };

export default async function VendorProfilePage({ searchParams }: { searchParams: Promise<{ submitted?: string; error?: string }> }) {
  const ctx = await requireVendorSection("profile");
  const sp = await searchParams;

  if (!ctx.vendorId) {
    return (
      <>
        <h1>Your profile</h1>
        <div className="auth-note auth-note--info" style={{ marginTop: "0.6rem" }}>
          Your public profile becomes editable once your application is approved. In the meantime you can review your
          application status and messages from our team.
        </div>
        <p><Link href="/vendors/dashboard" className="auth-link">← Back to overview</Link></p>
      </>
    );
  }

  const v = await prisma.vendor.findUnique({
    where: { id: ctx.vendorId },
    select: { businessName: true, ownerName: true, description: true, categoryId: true, serviceArea: true, phone: true, email: true, website: true, pendingProfile: true },
  });
  const hasPending = !!v?.pendingProfile;

  return (
    <>
      <h1>Your profile</h1>
      <p>Update your business details below. For everyone's trust, material changes are reviewed by our team before they go live.</p>

      {sp.submitted && <div className="auth-note auth-note--ok">Your changes were submitted for review. We'll publish them once approved.</div>}
      {hasPending && !sp.submitted && <div className="auth-note auth-note--warn">You have profile changes awaiting admin review.</div>}

      <form action={saveVendorProfileAction}>
        <div className="auth-row">
          <label className="auth-field"><span>Business name</span><input name="businessName" defaultValue={v?.businessName ?? ""} required /></label>
          <label className="auth-field"><span>Owner / contact name</span><input name="ownerName" defaultValue={v?.ownerName ?? ""} /></label>
        </div>
        <label className="auth-field"><span>Business description</span><input name="description" defaultValue={v?.description ?? ""} /></label>
        <div className="auth-row">
          <label className="auth-field"><span>Category</span>
            <select name="categoryId" defaultValue={v?.categoryId ?? ""}>
              {VENDOR_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
          <label className="auth-field"><span>Service area</span><input name="serviceArea" defaultValue={v?.serviceArea ?? ""} placeholder="Cities, counties, ZIP codes, travel radius" /></label>
        </div>
        <div className="auth-row">
          <label className="auth-field"><span>Phone</span><input name="phone" type="tel" defaultValue={v?.phone ?? ""} /></label>
          <label className="auth-field"><span>Business email</span><input name="email" type="email" defaultValue={v?.email ?? ""} /></label>
        </div>
        <div className="auth-row">
          <label className="auth-field"><span>Website</span><input name="website" defaultValue={v?.website ?? ""} placeholder="https://" /></label>
          <label className="auth-field"><span>Social links</span><input name="socials" placeholder="Instagram, Facebook, TikTok…" /></label>
        </div>

        <div className="auth-note auth-note--info">
          <b>Logo, hero image, portfolio photos &amp; videos:</b> upload activates once secure storage is connected. Until then,
          our team can add media for you — mention it in your messages.
        </div>

        <button type="submit" className="auth-btn" style={{ maxWidth: 280 }}>Submit changes for review</button>
      </form>
    </>
  );
}
