import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { pincodes } from "@/lib/schema";
import { apiUser } from "@/lib/auth";

// "Kodialbail S.O" → "Kodialbail", "District Courts S.O (Dakshina Kannada)" → "District Courts"
function cleanOfficeName(name: string): string {
  return name
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/\s+(S\.?O\.?|H\.?O\.?|B\.?O\.?|P\.?O\.?)$/i, "")
    .trim();
}

// "DAKSHINA KANNADA" → "Dakshina Kannada"
function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// Every post office under a pincode, head office first, so the form can
// default to the main town and offer the rest as choices.
export async function GET(req: NextRequest) {
  const { error } = await apiUser();
  if (error) return error;

  const pin = req.nextUrl.searchParams.get("pin")?.trim() ?? "";
  if (!/^\d{6}$/.test(pin)) return NextResponse.json({ error: "Enter a 6-digit pincode" }, { status: 400 });

  const rows = await db
    .select()
    .from(pincodes)
    .where(eq(pincodes.pincode, pin))
    .orderBy(sql`CASE ${pincodes.officetype} WHEN 'HO' THEN 1 WHEN 'PO' THEN 2 WHEN 'SO' THEN 2 ELSE 3 END`, pincodes.officename);
  if (!rows.length) return NextResponse.json({ error: "Pincode not found — type the location and state" }, { status: 404 });

  const places = [...new Set(rows.map((r) => cleanOfficeName(r.officename)))];
  return NextResponse.json({
    pincode: pin,
    location: places[0],
    places,
    district: titleCase(rows[0].district),
    state: titleCase(rows[0].statename),
  });
}
