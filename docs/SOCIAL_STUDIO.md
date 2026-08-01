# Magical Social Studio

Connect social accounts and share moments — beautifully optimized per
platform, always with explicit customer approval. Built inside the one
master application (`/dashboard/social`).

## Security model (built for real)

- **No passwords, ever.** Customers never enter an Instagram/Facebook/
  TikTok/YouTube password into Magical Moments. Connections use each
  platform's official **OAuth** authorization.
- **Encrypted tokens, server-side only.** Access tokens are encrypted
  with **AES-256-GCM** (`src/lib/crypto.ts`) before touching the
  database and are **never** returned to the browser, written to logs,
  placed in URLs, or shown on customer pages. The public connection
  shape (`ConnectionView`) is metadata only.
- **Disconnect anytime.** One click revokes a connection and clears its
  stored token.
- Connection UI shows: platform, connected profile/page name, status,
  date connected, plus reconnect and disconnect.

## Sandbox vs. live

This environment has **no real platform app credentials**, so the studio
runs in **sandbox mode**: "Connect" opens a clearly-labeled internal
consent screen instead of the platform's real one. Everything else — the
encrypted token model, the whole share workflow, results, and fallback —
is real.

Flip a platform to **live** by setting its `*_CLIENT_ID` +
`*_CLIENT_SECRET` (see `.env.example`). `realOAuthEnabled(platform)` is
the single switch; `/api/social/[platform]/authorize` is where the real
authorize-URL construction + token exchange slot in. Live mode also
requires meeting each platform's **eligibility, app-review, scope, and
quota** requirements.

## The share workflow (`ShareComposer`)

1. **Update** — what's being shared. For **Baby Journey** experiences,
   milestone quick-picks appear (announcement, ultrasound, gender reveal,
   … first birthday) plus the two **separate** approval questions:
   *notify followers?* and *share on social?* — neither is automatic.
2. **Platforms** — only **connected** accounts are shown, with
   "share to all" and "connect another account."
3. **Compose** — **Ask Magical** prepares a distinct, optimized version
   per platform (suggested/short/long caption, hashtags, title, CTA,
   link back, cover). Customer can edit/regenerate captions, remove
   hashtags, add emojis, change cover/media, change format, preview, and
   remove a platform. (Deterministic today; AI seam in
   `content-engine.ts`.)
4. **Review** — final review of platforms, account names, media,
   per-platform caption, hashtags, visibility, schedule, link, and AI
   disclosure — gated by the required authorization:
   *"I have reviewed this content and authorize Magical Moments by Reign
   to send it to the selected social-media accounts."*
5. **Results** — truthful per-platform status: Published, Sent as Draft,
   Processing, Needs Customer Action, Failed, Connection Expired — with
   view / copy-link / retry / reconnect / download / open-app actions.

## Platform-specific versions

One identical post is **never** blasted to every platform. Formats per
platform live in `src/lib/social/platforms.ts`:

| Platform  | Formats                                   | Direct post? | Fallback |
| --------- | ----------------------------------------- | ------------ | -------- |
| Instagram | feed, carousel, reel, story               | yes*         | prepare  |
| Facebook  | feed, album, video                        | yes*         | prepare  |
| TikTok    | vertical video, photo, **draft**          | audited only | draft    |
| YouTube   | standard video, short (+title/visibility) | yes*         | prepare  |

\* subject to account type + app review.

## Honest publishing & fallback

- One platform failing never blocks the others.
- A **draft** or **prepared** post is never reported as **Published**.
- When direct publishing isn't available (permissions, account type,
  app review, API limits): prepare correctly-formatted media, prepare
  caption + hashtags, offer one-tap download, copy caption, open the
  platform's official flow, and tell the customer exactly what final
  step to complete in-app. (`fallbackFor()` in `publish.ts`.)

## AI video rules (`src/lib/video/ai-video.ts`)

- **No baked-in text.** Never ask Kling (or any generative video model)
  to render lettering, names, dates, signs, banners, logos, or readable
  words. Generate clean footage only; add accurate text afterward via the
  Magical Moments video-composition system.
  `sanitizeGenerativePrompt()` strips text-rendering instructions.
- **Required notice** beneath every AI-generated/enhanced video
  (`AiVideoNotice`, exact wording in `AI_VIDEO_NOTICE`).

## Data model

`SocialConnection` (encrypted tokens + metadata), `SocialShare`
(approved share), `SocialShareTarget` (per-platform version + result).
See `prisma/schema.prisma`.

## Status: working now vs. later

- **Working now:** encrypted token storage, connect (sandbox)/disconnect/
  reconnect/expiry, connection UI, full 5-step composer, Ask Magical
  content prep, per-platform versions, review + authorization, honest
  results + fallback, AI-video notice + prompt sanitizer, baby-journey
  milestones + dual approval.
- **Later:** real OAuth per platform (credentials + app review), real
  publish API calls, real follower-notification delivery, scheduled
  publishing execution, media transcoding to each platform's spec.
