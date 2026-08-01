// ── Object storage (Supabase Storage) ───────────────────────────
// Uploads go DIRECTLY from the browser to Supabase Storage using a
// short-lived signed upload URL, so large video files never pass
// through (and get blocked by) the serverless function body limit.
//
// The server only (a) validates the upload against the plan and (b)
// mints the signed URL. Nothing here is exposed to the browser except
// the one-time signed token for the specific path.
//
// Env (server-only):
//   SUPABASE_URL                 https://<ref>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY    service role key (NEVER sent to client)
//   SUPABASE_STORAGE_BUCKET      bucket name (default "media")

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "media";

export function storageConfigured(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_KEY);
}

export interface SignedUpload {
  uploadUrl: string; // where the browser PUTs the bytes
  token: string;
  path: string; // path within the bucket
  publicUrl: string; // the final public URL to store on the MediaAsset
}

/** Ask Supabase for a one-time signed upload URL for `path`. */
export async function createSignedUpload(path: string): Promise<SignedUpload> {
  if (!storageConfigured()) throw new Error("Storage is not configured.");
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/upload/sign/${BUCKET}/${encodeURI(path)}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Could not create upload URL.");
  // data.url is a path like "/object/upload/sign/media/<path>?token=..."
  const uploadUrl = `${SUPABASE_URL}/storage/v1${data.url}`;
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURI(path)}`;
  return { uploadUrl, token: data.token, path, publicUrl };
}

/** Delete an object from the bucket (best-effort). */
export async function deleteObject(path: string): Promise<void> {
  if (!storageConfigured() || !path) return;
  await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURI(path)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${SERVICE_KEY}` },
  }).catch(() => {});
}

/** A safe, unique storage path for an experience's upload. */
export function buildPath(experienceId: string, filename: string, unique: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  return `experiences/${experienceId}/${unique}-${safe}`;
}
