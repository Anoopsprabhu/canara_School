import { requireUser } from "@/lib/auth";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import UsersManager, { type UserRow } from "./UsersManager";

export default async function UsersPage() {
  const me = await requireUser("users:manage");
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
  const initial = rows.map((u) => ({
    ...u,
    role: u.role as UserRow["role"],
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  }));
  return (
    <div className="space-y-6">
      <h1 className="page-title">User access</h1>
      <UsersManager meId={me.id} initial={initial} />
    </div>
  );
}
