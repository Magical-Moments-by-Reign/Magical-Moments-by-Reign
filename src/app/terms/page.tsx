import type { Metadata } from "next";
import Link from "next/link";
import { currentAccount } from "@/lib/auth-session";
import { PublicNav, PublicFooter } from "@/components/site/PublicChrome";
import "../legal.css";

// Public, no-login route (Twilio/A2P + general terms compliance). Never
// gated behind requireAccount — same pattern as /privacy-policy.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Terms of Service — Magical Moments by Reign",
  description: "The terms that govern your use of Magical Moments by Reign, including SMS/MMS messaging terms.",
};

const LAST_UPDATED = "August 23, 2026";

export default async function TermsPage() {
  const signedIn = Boolean(await currentAccount());
  return (
    <div className="legal-page">
      <PublicNav active={null} signedIn={signedIn} />
      <div className="legal-wrap">
        <span className="legal-eyebrow">Legal</span>
        <h1 className="legal-title">Terms of Service</h1>
        <p className="legal-updated">Last updated: {LAST_UPDATED}</p>

        <div className="legal-toc">
          <b>On this page</b>
          <ol>
            <li><a href="#acceptance">Acceptance of terms</a></li>
            <li><a href="#the-service">The Service</a></li>
            <li><a href="#accounts">Accounts &amp; guest access</a></li>
            <li><a href="#sms-terms">SMS/MMS messaging terms</a></li>
            <li><a href="#acceptable-use">Acceptable use</a></li>
            <li><a href="#content">Your content</a></li>
            <li><a href="#disclaimers">Disclaimers &amp; limitation of liability</a></li>
            <li><a href="#changes">Changes to these terms</a></li>
            <li><a href="#contact">Contact us</a></li>
          </ol>
        </div>

        <h2 id="acceptance">1. Acceptance of terms</h2>
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the website, dashboard, and
          related services operated by <strong>Magical Moments by Reign</strong> (&ldquo;Magical Moments,&rdquo;
          &ldquo;we,&rdquo; &ldquo;us&rdquo;) at <a href="https://magicalmomentsbyreign.com">magicalmomentsbyreign.com</a>{" "}
          (the &ldquo;Service&rdquo;). By creating an account, accepting an invitation, or otherwise using the
          Service, you agree to these Terms and to our <Link href="/privacy-policy">Privacy Policy</Link>. If you
          do not agree, do not use the Service.
        </p>

        <h2 id="the-service">2. The Service</h2>
        <p>
          Magical Moments is a platform for planning, celebrating, and preserving life&rsquo;s occasions — including
          weddings, births, graduations, new homes, and other journeys — and includes features such as occasion
          pages, guestbooks, gift registries, video invitations, a Family Command Center and vault, Magical
          Discovery (news, entertainment, sports, and events content), Magical Picks and Fantasy Football (real-NFL
          fantasy sports), and Luxury Services/Concierge (including travel, airfare, hotel, and restaurant
          reservation assistance). Not every feature is available on every membership tier, and features described
          on the Service may be added, changed, or retired over time.
        </p>

        <h2 id="accounts">3. Accounts &amp; guest access</h2>
        <p>
          You must provide accurate information when creating an account and are responsible for maintaining the
          confidentiality of your login credentials and for all activity under your account. Some features let a
          member invite another person — a family member, event guest, or fantasy-league participant — who may
          participate on a limited, guest basis without creating a full account. Guest access is scoped to the
          specific league, event, or space the invitation was issued for, and does not grant access to the inviting
          member&rsquo;s other content or to unrelated areas of the Service. A guest may later create a full account;
          where technically supported, their guest activity (such as a fantasy team or roster) will be preserved and
          attached to the new account.
        </p>

        <h2 id="sms-terms">4. SMS/MMS messaging terms</h2>
        <div className="legal-callout">
          <p>By providing your mobile phone number and opting in to text notifications, you agree to receive SMS/MMS messages from Magical Moments related to: account security codes; invitations (family, guest, event, video invitation, Fantasy Football league); registry and gift activity; travel, airfare, hotel, and restaurant reservation confirmations and updates; event reminders; and messages from other members sent through the Service where you&rsquo;ve enabled SMS delivery.</p>
          <p><strong>Consent to receive text messages is never a condition of purchase</strong> or of using any part of the Service. <strong>Message frequency varies</strong> based on your activity and enabled notification categories. <strong>Message and data rates may apply</strong> from your mobile carrier.</p>
          <p>Reply <strong>STOP</strong> to any text message at any time to opt out of SMS messaging; you will receive one confirmation message and no further texts unless you opt back in. Reply <strong>HELP</strong> for assistance, or contact <a href="mailto:info@magicalmomentsbyreign.com">info@magicalmomentsbyreign.com</a>. Every message we send will identify Magical Moments as the sender.</p>
          <p><strong>Carrier delivery is not guaranteed.</strong> Magical Moments is not liable for messages that are delayed or undelivered due to your carrier, device, or network conditions outside our control. Supported carriers may change without notice, and Magical Moments and its SMS delivery provider are not responsible for delays or failures caused by your carrier or device.</p>
          <p>See our <Link href="/privacy-policy#sms">Privacy Policy</Link> for how we use and protect your phone number and messaging data.</p>
        </div>

        <h2 id="acceptable-use">5. Acceptable use</h2>
        <p>You agree not to: use the Service for any unlawful purpose; upload content that is harmful, harassing, defamatory, or infringes another person&rsquo;s rights; attempt to gain unauthorized access to another member&rsquo;s account, content, or invitation-only spaces; send unsolicited bulk messages or spam through the Service&rsquo;s invitation or messaging features; misuse Fantasy Football, Magical Picks, or any prediction/game feature for real-money wagering (these features are entertainment only); or interfere with the security or normal operation of the Service.</p>

        <h2 id="content">6. Your content</h2>
        <p>You retain ownership of the content you upload to the Service (photos, messages, registry details, and similar). You grant Magical Moments a limited license to host, store, and display that content as necessary to provide the Service to you and the people you&rsquo;ve chosen to share it with. You are responsible for having the rights to any content you upload and for ensuring your use of invitation and messaging features (including SMS) complies with these Terms and applicable law.</p>

        <h2 id="disclaimers">7. Disclaimers &amp; limitation of liability</h2>
        <p>
          The Service, including any travel, reservation, sports data, or third-party-sourced content, is provided
          &ldquo;as is&rdquo; without warranties of any kind, express or implied. Magical Moments does not guarantee
          the accuracy, availability, or timeliness of third-party data (including live sports scores/statistics,
          travel and reservation availability, or SMS/email delivery) and is not responsible for the acts or
          omissions of third-party providers used to deliver parts of the Service. To the fullest extent permitted
          by law, Magical Moments and its officers, employees, and service providers are not liable for any
          indirect, incidental, or consequential damages arising from your use of the Service.
        </p>

        <h2 id="changes">8. Changes to these terms</h2>
        <p>We may update these Terms from time to time. If we make material changes, we will update the &ldquo;Last updated&rdquo; date above and, where appropriate, notify you through the Service. Continued use of the Service after changes take effect constitutes acceptance of the updated Terms.</p>

        <h2 id="contact">9. Contact us</h2>
        <p>Questions about these Terms can be sent to <a href="mailto:info@magicalmomentsbyreign.com">info@magicalmomentsbyreign.com</a>.</p>
      </div>
      <PublicFooter year={new Date().getFullYear()} />
    </div>
  );
}
