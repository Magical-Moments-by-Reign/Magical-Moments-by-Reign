# Custom Business Websites — order pipeline

Custom business websites are a **concierge, quote-based service**, kept
separate from the self-serve Magical Moments memory experiences. This
document explains the end-to-end flow and how to configure it.

## The flow

1. **Client submits a request** on the public page **`/business`**
   (linked from the nav "Business Sites" and the home-page CTA).
   - Creates a `CustomWebsiteRequest` record with a reference number
     `MMR-CW-XXXXXX`.
   - Client sees an on-screen thank-you and receives a branded
     **"we received your request"** email.
   - The admin inbox (`ADMIN_EMAIL`) gets a **new request** notification.

2. **Admin reviews & accepts** in **`/admin/custom-websites`**.
   - Clicking **"Accept & email client"** marks the request `ACCEPTED`
     and sends the client the **"we've accepted your project — please be
     on standby for a phone call"** email, including the intake form link.
   - Admin can also update status (`NEW → ACCEPTED → IN_PROGRESS →
     COMPLETE / DECLINED`) and keep internal notes.

3. **Client completes the intake Jotform** (link is in the acceptance
   email) so the team gathers everything needed to build the site.

## The "spreadsheet"

Two options, both point at `info@magicalmomentsbyreign.com`:

- **In-app export (built in):** the admin page has
  **"Export spreadsheet (CSV)"** → `/admin/custom-websites/export`.
  The CSV opens directly in Excel or Google Sheets and can be saved or
  emailed. It always reflects every order.
- **Live sync (recommended):** connect the intake **Jotform to Google
  Sheets** (Jotform → *Settings → Integrations → Google Sheets*). Every
  submission then appends to a shared sheet automatically. Share that
  sheet with `info@magicalmomentsbyreign.com`, or use Jotform's email
  notification to send each submission there.

> The deployed app can't run MCP integrations at runtime, so live sync is
> handled by Jotform's native integrations rather than in app code.

## Emails

All email is sent through **Resend**. Set `RESEND_API_KEY`, `MAIL_FROM`
(on a verified domain), and `ADMIN_EMAIL`. If `RESEND_API_KEY` is unset,
email is safely skipped (logged) and nothing breaks. Templates live in
`src/lib/email.ts`:

- `customWebsiteReceivedEmail` — client, on submit
- `adminCustomWebsiteNotifyEmail` — admin, on submit
- `customWebsiteAcceptedEmail` — client, on accept ("stand by for a call")
- `purchaseThankYouEmail` — client, on **any** experience order (with
  step-by-step "how to build the most amazing site ever" instructions)
- `adminOrderNotifyEmail` — admin, on any experience order

## The intake Jotform

Create the intake form in Jotform (a ready-made description is in the
project history / can be generated via the connected Jotform account),
then either:

- set `CUSTOM_INTAKE_FORM_URL` to its public link (used as the default in
  acceptance emails), **and/or**
- paste a per-request link in the admin "Accept" box.

To embed it directly on the site later, use the Jotform embed code.

## Configuration checklist

| Env var | Purpose |
| --- | --- |
| `ADMIN_PASSWORD` | Enables the `/admin` area (password gate). |
| `RESEND_API_KEY` | Enables transactional email. |
| `MAIL_FROM` | Verified "from" address. |
| `ADMIN_EMAIL` | Where admin notifications go. |
| `CUSTOM_INTAKE_FORM_URL` | Default intake-form link in acceptance emails. |

## Admin access

Visit `/admin/login`, enter `ADMIN_PASSWORD`. A 12-hour httpOnly session
cookie is set (stores a hash of the password, never the raw secret).
`/admin/custom-websites` and the CSV export are gated behind it.
