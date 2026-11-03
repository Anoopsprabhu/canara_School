import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { verifyPassword, createSessionToken, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username?.trim() || !password) {
    return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
  }
  const [user] = await db.select().from(users).where(eq(users.username, username.trim().toLowerCase()));

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }
  if (!user.active) {
    return NextResponse.json(
      { error: "Your access has been revoked. Contact the super admin." },
      { status: 403 }
    );
  }

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await setSessionCookie(await createSessionToken({ userId: user.id, v: user.sessionVersion }));
  return NextResponse.json({ username: user.username, role: user.role });
}
