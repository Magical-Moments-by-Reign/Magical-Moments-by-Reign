"use server";

// ── Social connection actions ───────────────────────────────────
// Sandbox connect + real disconnect/reconnect. In live mode the
// "connect" action redirects to the platform's official authorize URL
// instead of the labeled demo consent screen.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/session";
import {
  completeSandboxConnection,
  disconnect,
  markExpired,
  realOAuthEnabled,
} from "@/lib/social/connections";
import { getPlatform, type PlatformId } from "@/lib/social/platforms";

function assertPlatform(value: string): PlatformId {
  if (!getPlatform(value)) throw new Error("Unknown platform");
  return value as PlatformId;
}

/** Begin connecting. Sends the customer to the official authorization
 *  screen (live) or the clearly-labeled sandbox consent screen (demo). */
export async function beginConnectAction(formData: FormData): Promise<void> {
  const platform = assertPlatform(String(formData.get("platform") || ""));
  if (realOAuthEnabled(platform)) {
    // LIVE: redirect to the platform's real OAuth authorize URL.
    // (Built from client id + scopes + redirect_uri; token exchange
    // happens in the callback route.) Not reachable without creds.
    redirect(`/api/social/${platform}/authorize`);
  }
  // SANDBOX: a labeled internal consent screen — no password ever
  // entered into Magical Moments.
  redirect(`/dashboard/social/authorize?platform=${platform}`);
}

/** Finish the sandbox authorization (the demo consent screen's button). */
export async function completeSandboxAction(formData: FormData): Promise<void> {
  const platform = assertPlatform(String(formData.get("platform") || ""));
  const userId = await getCurrentUserId();
  await completeSandboxConnection(userId, platform);
  revalidatePath("/dashboard/social");
  redirect("/dashboard/social?connected=" + platform);
}

export async function disconnectAction(formData: FormData): Promise<void> {
  const platform = assertPlatform(String(formData.get("platform") || ""));
  const userId = await getCurrentUserId();
  await disconnect(userId, platform);
  revalidatePath("/dashboard/social");
}

export async function reconnectAction(formData: FormData): Promise<void> {
  // Reconnect is the same entry point as connect.
  await beginConnectAction(formData);
}

/** Demo helper: force a connection into the EXPIRED state so the
 *  "Connection Expired" + reconnect UX can be seen. */
export async function expireAction(formData: FormData): Promise<void> {
  const platform = assertPlatform(String(formData.get("platform") || ""));
  const userId = await getCurrentUserId();
  await markExpired(userId, platform);
  revalidatePath("/dashboard/social");
}
