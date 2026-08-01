// GET /admin/custom-websites/export — CSV of every custom website request.
// Admin-gated. Opens directly in Excel / Google Sheets. This is the
// "spreadsheet" that grows as custom website orders are placed; the file
// can be saved/emailed to info@magicalmomentsbyreign.com. (For always-on
// live sync into a shared sheet, connect the intake Jotform to Google
// Sheets — see docs/CUSTOM_WEBSITES.md.)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";

function esc(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.customWebsiteRequest.findMany({ orderBy: { createdAt: "desc" } });
  const headers = [
    "Reference", "Status", "Name", "Business", "Email", "Phone",
    "Project type", "Budget", "Timeline", "Details", "Notes",
    "Intake form", "Created", "Accepted",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push([
      r.number, r.status, r.name, r.business, r.email, r.phone,
      r.projectType, r.budget, r.timeline, r.details, r.notes,
      r.jotformUrl, r.createdAt.toISOString(), r.acceptedAt?.toISOString() ?? "",
    ].map(esc).join(","));
  }
  const csv = "﻿" + lines.join("\r\n"); // BOM so Excel reads UTF-8

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="custom-website-orders.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
