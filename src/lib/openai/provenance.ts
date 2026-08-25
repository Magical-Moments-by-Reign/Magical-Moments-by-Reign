// ── Verified data provenance — shared shape (SERVER ONLY) ────────────────
// One generic provenance shape any feature's fact resolver can produce —
// not just Sports. A feature-specific resolver may extend this with its
// own extra fields (see sports/openai-resolver.ts's SportsDataProvenance)
// but should never invent a parallel, differently-shaped provenance object
// for the same purpose.

export type VerifiedDataResolver = "primary_provider" | "secondary_provider" | "openai_web_search" | "owner_verified";

export interface VerifiedDataSource {
  title?: string;
  url: string;
}

export interface VerifiedDataProvenance {
  resolver: VerifiedDataResolver;
  sources: VerifiedDataSource[];
  verifiedAt: string; // ISO
  fetchedAt: string; // ISO
}
