import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/site/SiteNav";
import SiteFooter from "@/components/site/SiteFooter";
import { VENDOR_CATEGORIES, BECOME_A_VENDOR, VENDOR_NOTICE } from "@/lib/vendors";
import { submitVendorApplication } from "./actions";
import "../vendors.css";

export const metadata: Metadata = {
  title: "Become a Vendor — Application",
  description: BECOME_A_VENDOR.body,
};

export default async function VendorApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const sp = await searchParams;

  return (
    <div className="vm">
      <SiteNav active="vendors" />
      <main className="vm-main">
        <header className="vm-hero vm-hero--compact">
          <div className="vm-inner">
            <span className="vm-eyebrow">Become a Vendor</span>
            <h1 className="vm-title">{BECOME_A_VENDOR.headline}</h1>
            <p className="vm-tagline">{BECOME_A_VENDOR.body}</p>
          </div>
        </header>

        <div className="vm-inner vm-apply">
          {sp.sent ? (
            <div className="vm-success" role="status">
              <span className="vm-success__check" aria-hidden="true">✓</span>
              <h2>Application received</h2>
              <p>
                Thank you — your application reference is <strong>{sp.sent}</strong>. Our team reviews new
                vendors on a limited basis and will be in touch. You&apos;ll add your logo and gallery once approved.
              </p>
              <Link href="/vendors" className="btn-gold">Back to the Marketplace</Link>
            </div>
          ) : (
            <>
              {sp.error && (
                <p className="vm-formerror" role="alert">
                  Please complete all required fields (including agreeing to the terms) and try again.
                </p>
              )}
              <form className="vm-form" action={submitVendorApplication}>
                <div className="vm-form__grid">
                  <label>Business name*<input type="text" name="businessName" required /></label>
                  <label>Owner name*<input type="text" name="ownerName" required /></label>
                  <label>Business email*<input type="email" name="email" required /></label>
                  <label>Phone<input type="tel" name="phone" /></label>
                  <label>Website<input type="url" name="website" placeholder="https://" /></label>
                  <label>Business category*
                    <select name="categoryId" required defaultValue="">
                      <option value="" disabled>Select a category…</option>
                      {VENDOR_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </label>
                  <label>Years in business<input type="number" name="yearsInBusiness" min={0} /></label>
                  <label>City*<input type="text" name="city" required /></label>
                  <label>State*<input type="text" name="state" maxLength={2} required /></label>
                  <label>Business license (optional)<input type="text" name="businessLicense" /></label>
                  <label>Insurance (optional)<input type="text" name="insurance" /></label>
                  <label>Social media<input type="text" name="socials" placeholder="Instagram / Facebook link" /></label>
                </div>

                <label className="vm-form__full">Description*
                  <textarea name="description" rows={4} required placeholder="Tell families about your business and services…" />
                </label>
                <label className="vm-form__full">References (optional)
                  <textarea name="references" rows={2} />
                </label>

                <p className="vm-form__note">
                  Logo &amp; gallery uploads are added once your application is approved.
                </p>

                {/* Vendor Notice acknowledgment */}
                <fieldset className="vm-form__notice">
                  <legend>{VENDOR_NOTICE.title}</legend>
                  <p>{VENDOR_NOTICE.text}</p>
                  <label className="vm-form__check">
                    <input type="checkbox" name="agreedTerms" required />
                    <span>I agree to the Terms &amp; understand vendors are independent businesses.</span>
                  </label>
                </fieldset>

                <button type="submit" className="btn-gold vm-form__submit">{BECOME_A_VENDOR.cta}</button>
                <p className="vm-form__fine">
                  Applications are accepted on a limited basis to ensure every family receives the highest level of care.
                </p>
              </form>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
