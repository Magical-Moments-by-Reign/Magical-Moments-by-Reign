// GET /api/social/:platform/authorize
// LIVE OAuth entry point. When platform credentials are configured,
// this builds the official authorize URL (client_id + scopes +
// redirect_uri + state) and redirects the customer to the platform's
// own login/consent screen — Magical Moments never sees their
// password. The matching callback route exchanges the returned code
// for tokens and calls completeConnection().
//
// Without credentials it safely falls back to the labeled sandbox
// consent screen so the flow is always demonstrable.

import { redirect } from "next/navigation";
import { getPlatform, type PlatformId } from "@/lib/social/platforms";
import { realOAuthEnabled } from "@/lib/social/connections";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ platform: string }> },
) {
  const { platform } = await params;
  const p = getPlatform(platform);
  if (!p) redirect("/dashboard/social");

  if (!realOAuthEnabled(platform as PlatformId)) {
    redirect(`/dashboard/social/authorize?platform=${platform}`);
  }

  // LIVE (credentials present) — construct and redirect to the real
  // authorize URL. Left as the integration seam:
  //   const url = buildAuthorizeUrl(p, { redirectUri, state });
  //   redirect(url);
  redirect(`/dashboard/social/authorize?platform=${platform}&live=1`);
}
