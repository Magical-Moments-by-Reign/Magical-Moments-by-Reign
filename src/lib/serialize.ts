// ── JSON (de)serialization for TEXT-stored blobs ────────────────
// designSpec and content are stored as TEXT for cross-database
// portability (SQLite in dev, Postgres in prod). These helpers give
// the rest of the app strongly-typed access.

import type { DesignSpec, ExperienceContent } from "@/types";

export interface HydratedExperience {
  id: string;
  slug: string;
  type: string;
  title: string;
  subtitle: string | null;
  eventDate: Date | null;
  status: string;
  visibility: string;
  seed: string;
  designSpec: DesignSpec;
  content: ExperienceContent;
  createdAt: Date;
  updatedAt: Date;
}

/** Row shape we care about from Prisma (kept loose to avoid import cycles). */
interface RawExperience {
  id: string;
  slug: string;
  type: string;
  title: string;
  subtitle: string | null;
  eventDate: Date | null;
  status: string;
  visibility: string;
  seed: string;
  designSpec: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export function hydrateExperience(row: RawExperience): HydratedExperience {
  return {
    ...row,
    designSpec: JSON.parse(row.designSpec) as DesignSpec,
    content: JSON.parse(row.content) as ExperienceContent,
  };
}

export function serialize(value: unknown): string {
  return JSON.stringify(value);
}
