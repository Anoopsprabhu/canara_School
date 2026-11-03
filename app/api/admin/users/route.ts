import { NextRequest, NextResponse } from "next/server";
import { asc, like } from "drizzle-orm";
import { db, isUniqueViolation } from "@/lib/db";
import { users } from "@/lib/schema";
import { apiUser, generatePassword, hashPassword } from "@/lib/auth";
import { isRole } from "@/lib/roles";

export async function GET() {
  const { error } = await apiUser("users:manage");
  if (error) return error;
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      role: users.role,
      active: users.active,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.id));
  return NextResponse.json(rows);
}

// "Vivek Pai" → "vivek.pai", then "vivek.pai2", "vivek.pai3"… if taken.
async function uniqueUsername(base: string): Promise<string> {
  const clean =
    base
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9\s.]/g, "")
      .trim()
      .split(/[\s.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .join(".") || "user";
  const taken = new Set(
    (await db.select({ u: users.username }).from(users).where(like(users.username, `${clean}%`))).map((r) => r.u)
  );
  if (!taken.has(clean)) return clean;
  for (let i = 2; ; i++) if (!taken.has(`${clean}${i}`)) return `${clean}${i}`;
}

export async function POST(req: NextRequest) {
  const { user, error } = await apiUser("users:manage");
  if (error) return error;

  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const role = body.role;
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!isRole(role)) return NextResponse.json({ error: "Choose a role" }, { status: 400 });

  const requested = String(body.username ?? "").trim().toLowerCase();
  if (requested && !/^[a-z0-9._-]{3,30}$/.test(requested)) {
    return NextResponse.json(
      { error: "Username: 3–30 characters, letters, numbers, dot, dash or underscore" },
      { status: 400 }
    );
  }
  const username = requested || (await uniqueUsername(name));
  const password = generatePassword();

  try {
    const [created] = await db
      .insert(users)
      .values({ name, username, role, passwordHash: await hashPassword(password), createdBy: user.id })
      .returning({ id: users.id });
    // The plain password is returned exactly once so the super admin can share it.
    return NextResponse.json({ id: created.id, username, password }, { status: 201 });
  } catch (e) {
    if (isUniqueViolation(e)) {
      return NextResponse.json({ error: `Username "${username}" is already taken` }, { status: 409 });
    }
    throw e;
  }
}
