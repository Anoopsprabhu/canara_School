import "server-only";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "./db";
import { members, users } from "./schema";

const creator = alias(users, "creator");
const updater = alias(users, "updater");
const approver = alias(users, "approver");

export async function getMember(id: number) {
  if (!Number.isInteger(id)) return null;
  const [row] = await db
    .select({
      member: members,
      createdByName: creator.name,
      updatedByName: updater.name,
      approvedByName: approver.name,
    })
    .from(members)
    .leftJoin(creator, eq(creator.id, members.createdBy))
    .leftJoin(updater, eq(updater.id, members.updatedBy))
    .leftJoin(approver, eq(approver.id, members.approvedBy))
    .where(eq(members.id, id));
  return row ?? null;
}

export type Member = typeof members.$inferSelect;
