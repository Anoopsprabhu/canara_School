import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { apiUser, createSessionToken, hashPassword, setSessionCookie, verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { user, error } = await apiUser();
  if (error) return error;

  const { currentPassword, newPassword } = await req.json();
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  }
  const [row] = await db.select().from(users).where(eq(users.id, user.id));
  if (!row || !(await verifyPassword(currentPassword ?? "", row.passwordHash))) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  // Signs out every other device; this one gets a fresh cookie.
  const v = row.sessionVersion + 1;
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(newPassword), sessionVersion: v })
    .where(eq(users.id, user.id));
  await setSessionCookie(await createSessionToken({ userId: user.id, v }));
  return NextResponse.json({ ok: true });
}
