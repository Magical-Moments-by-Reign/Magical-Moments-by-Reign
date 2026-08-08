// ── Magical Moments Live — cloud recording hooks (INERT for now) ─
//
// Live streaming works with AGORA_APP_ID + AGORA_APP_CERTIFICATE alone. Cloud
// recording + replay require MORE: Agora Customer ID/Secret (RESTful auth) AND
// a storage bucket (S3/OSS/etc.). Until those exist these are honest no-ops:
// they NEVER start a fake recording and NEVER fabricate a replay URL. When the
// credentials arrive, only the bodies of start/stop change — callers already
// branch on `configured`.

export function recordingConfigured(): boolean {
  return Boolean(
    process.env.AGORA_CUSTOMER_ID &&
    process.env.AGORA_CUSTOMER_SECRET &&
    process.env.AGORA_RECORDING_BUCKET, // storage target (S3/OSS/GCS)
  );
}

export interface RecordingHandle {
  configured: boolean;
  resourceId?: string;
  sid?: string;
  message: string;
}

/** Start cloud recording for a channel. No-op (honest) until configured. */
export async function startRecording(_channel: string): Promise<RecordingHandle> {
  void _channel;
  if (!recordingConfigured()) {
    return { configured: false, message: "Cloud recording isn't connected yet (needs Agora Customer ID/Secret + a storage bucket)." };
  }
  // TODO(when configured): acquire() + start() against Agora Cloud Recording
  // RESTful API using Customer ID/Secret, writing to the storage bucket.
  return { configured: true, message: "Recording start is wired but not yet implemented for the connected credentials." };
}

export interface RecordingResult {
  configured: boolean;
  /** A REAL recording URL, only ever set from a real provider response. */
  recordingUrl?: string;
  message: string;
}

/** Stop recording. Returns a real URL only from a real provider response. */
export async function stopRecording(_resourceId: string, _sid: string, _channel: string): Promise<RecordingResult> {
  void _resourceId; void _sid; void _channel;
  if (!recordingConfigured()) {
    return { configured: false, message: "Cloud recording isn't connected yet — no replay is produced." };
  }
  // TODO(when configured): stop() then resolve the stored file URL from the
  // bucket. Only then set recordingUrl on the room and flip status → REPLAY.
  return { configured: true, message: "Recording stop is wired but not yet implemented for the connected credentials." };
}
