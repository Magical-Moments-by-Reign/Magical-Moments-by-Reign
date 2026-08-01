// POST /api/upload/delete — remove a media asset (and its stored file).

import { NextResponse } from "next/server";
import { getAsset, deleteAsset } from "@/lib/media";
import { deleteObject } from "@/lib/storage";

export async function POST(request: Request) {
  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const asset = await getAsset(body.id);
  if (!asset) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (asset.storagePath) await deleteObject(asset.storagePath);
  await deleteAsset(asset.id);
  return NextResponse.json({ ok: true });
}
