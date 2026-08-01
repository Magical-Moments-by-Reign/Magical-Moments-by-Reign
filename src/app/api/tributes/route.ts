// GET  /api/tributes?slug=&kind=  → published tributes for an experience
// POST /api/tributes              → leave a message or poem

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { listTributes, createTribute, type TributeKind } from "@/lib/tributes";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const kind = (searchParams.get("kind") as TributeKind) || undefined;
  if (!slug) return NextResponse.json({ error: "slug is required." }, { status: 400 });

  const exp = await prisma.experience.findUnique({ where: { slug }, select: { id: true } });
  if (!exp) return NextResponse.json({ tributes: [] });

  const tributes = await listTributes(exp.id, kind);
  return NextResponse.json({
    tributes: tributes.map((t) => ({
      id: t.id, kind: t.kind, name: t.name, relationship: t.relationship,
      body: t.body, createdAt: t.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  let body: { slug?: string; kind?: TributeKind; name?: string; relationship?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!body.slug || !body.name || !body.body) {
    return NextResponse.json({ error: "Name and message are required." }, { status: 400 });
  }
  try {
    const t = await createTribute({
      slug: body.slug,
      kind: body.kind === "poem" ? "poem" : "message",
      name: body.name,
      relationship: body.relationship,
      body: body.body,
    });
    return NextResponse.json({ id: t.id, name: t.name, relationship: t.relationship, body: t.body, kind: t.kind, createdAt: t.createdAt }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
