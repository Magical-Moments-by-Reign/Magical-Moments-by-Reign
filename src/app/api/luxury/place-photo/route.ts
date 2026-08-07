import { NextResponse } from "next/server";
import { currentAccount } from "@/lib/auth-session";
import { fetchPlacePhoto } from "@/lib/reservations/providers/google-places";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Server-side proxy for Google Places photos. The Google photo-media URL embeds
// the API key, so the browser must never see it — instead <img> points here,
// and we fetch the bytes server-side and stream them back. Gated to signed-in
// accounts so it can't be used to burn our Places quota anonymously.
export async function GET(req: Request) {
  const account = await currentAccount().catch(() => null);
  if (!account) return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const name = url.searchParams.get("name") || "";
  const width = parseInt(url.searchParams.get("w") || "800", 10);
  if (!name.startsWith("places/")) return new NextResponse("Bad request", { status: 400 });

  const photo = await fetchPlacePhoto(name, Number.isFinite(width) ? width : 800);
  if (!photo) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(photo.body, {
    status: 200,
    headers: {
      "Content-Type": photo.contentType,
      // Restaurant photos are stable; cache at the edge/browser for a day.
      "Cache-Control": "private, max-age=86400",
    },
  });
}
