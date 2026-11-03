import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { apiUser, generatePassword, hashPassword } from "@/lib/auth";
import { isRole } from "@/lib/roles";

// Never leave the portal without an active super admin.
async function otherActiveSuperAdmins(id: number) {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "super_admin"), eq(users.active, true), ne(users.id, id)));
  return rows.length;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await apiUser("users:manage");
  if (error) return error;

  const id = Number((await params).id);
  const [target] = await db.select().from(users).where(eq(users.id, id));
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();
  const bump = sql`${users.sessionVersion} + 1`;

  switch (body.action) {
    case "reset_password": {
      const password = generatePassword();
      await db
        .update(users)
        .set({ passwordHash: await hashPassword(password), sessionVersion: bump })
        .where(eq(users.id, id));
      return NextResponse.json({ username: target.username, password });
    }
    case "revoke": {
      if (id === user.id) {
        return NextResponse.json({ error: "You can't revoke your own access" }, { status: 400 });
      }
      if (target.role === "super_admin" && (await otherActiveSuperAdmins(id)) === 0) {
        return NextResponse.json({ error: "Keep at least one active super admin" }, { status: 400 });
      }
      await db.update(users).set({ active: false, sessionVersion: bump }).where(eq(users.id, id));
      return NextResponse.json({ ok: true });
    }
    case "restore": {
      await db.update(users).set({ active: true }).where(eq(users.id, id));
      return NextResponse.json({ ok: true });
    }
    case "update": {
      const name = String(body.name ?? target.name).trim();
      const role = body.role ?? target.role;
      if (!isRole(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      if (target.role === "super_admin" && role !== "super_admin") {
        if (id === user.id) {
          return NextResponse.json({ error: "You can't remove your own super admin role" }, { status: 400 });
        }
        if ((await otherActiveSuperAdmins(id)) === 0) {
          return NextResponse.json({ error: "Keep at least one active super admin" }, { status: 400 });
        }
      }
      await db.update(users).set({ name, role }).where(eq(users.id, id));
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
