import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users } from "./schema";
import { can, type Permission, type Role } from "./roles";

export const SESSION_COOKIE_NAME = "chsoba_session";
const secret = new TextEncoder().encode(process.env.SESSION_SECRET!);

export type SessionPayload = { userId: number; v: number };

export type CurrentUser = {
  id: number;
  name: string;
  username: string;
  role: Role;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Easy to read out over the phone: no look-alike characters (0/O, 1/l/I).
export function generatePassword(): string {
  const words = ["canara", "dongerkery", "kodial", "alumni", "centenary", "school", "mangala"];
  const letters = "abcdefghjkmnpqrstuvwxyz";
  const word = words[randomInt(words.length)];
  const digits = randomInt(1000, 10000);
  const tail = letters[randomInt(letters.length)] + letters[randomInt(letters.length)];
  return `${word}${digits}${tail}`;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

// The JWT only proves who signed in; the database decides whether they still
// may. A revoked user or a reset password bumps session_version, which makes
// every older cookie fail here on the very next request.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  const [user] = await db.select().from(users).where(eq(users.id, payload.userId));
  if (!user || !user.active || user.sessionVersion !== payload.v) return null;
  return { id: user.id, name: user.name, username: user.username, role: user.role as Role };
});

// For server components / pages.
export async function requireUser(perm?: Permission): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (perm && !can(user.role, perm)) redirect("/");
  return user;
}

// For route handlers: returns the user, or a ready-made error response.
export async function apiUser(
  perm?: Permission
): Promise<{ user: CurrentUser; error?: never } | { user?: never; error: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Your session has ended. Please sign in again." }, { status: 401 }) };
  }
  if (perm && !can(user.role, perm)) {
    return { error: NextResponse.json({ error: "You don't have permission to do this." }, { status: 403 }) };
  }
  return { user };
}
