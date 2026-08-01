// ── Experiences API ─────────────────────────────────────────────
// Programmatic access to the master application's experiences.
//   GET  /api/experiences        → list all
//   POST /api/experiences        → create one { type, title, subtitle?, slug? }

import { NextResponse } from "next/server";
import { createExperience, listExperiences } from "@/lib/experiences";
import { getExperienceType } from "@/lib/experience-types";

export async function GET() {
  const experiences = await listExperiences();
  return NextResponse.json(
    experiences.map((e) => ({
      slug: e.slug,
      type: e.type,
      title: e.title,
      url: `/${e.slug}`,
      palette: e.designSpec.palette.name,
      mood: e.designSpec.mood,
    })),
  );
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const type = typeof body.type === "string" ? body.type : "";
  const title = typeof body.title === "string" ? body.title : "";

  if (!type || !title) {
    return NextResponse.json(
      { error: "Both `type` and `title` are required." },
      { status: 400 },
    );
  }
  if (!getExperienceType(type)) {
    return NextResponse.json(
      { error: `Unknown experience type: ${type}` },
      { status: 400 },
    );
  }

  const experience = await createExperience({
    type,
    title,
    subtitle: typeof body.subtitle === "string" ? body.subtitle : undefined,
    desiredSlug: typeof body.slug === "string" ? body.slug : undefined,
  });

  return NextResponse.json(
    {
      slug: experience.slug,
      url: `/${experience.slug}`,
      title: experience.title,
      design: {
        palette: experience.designSpec.palette.name,
        fonts: experience.designSpec.fonts.name,
        mood: experience.designSpec.mood,
        sectionOrder: experience.designSpec.sectionOrder,
      },
    },
    { status: 201 },
  );
}
