import "server-only";
import { and, asc, eq, gte, lte, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "./db";
import { members, users } from "./schema";
import { PAYMENT_MODES, todayISO } from "./format";

const collector = alias(users, "collector");
const approver = alias(users, "approver");

export type ReportFilters = {
  from: string;
  to: string;
  mode: string;
  collectedBy: string; // user id, "" = everyone
  status: string; // member status, "all" = every status
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;

// Defaults to the current month of approved members.
export function parseFilters(sp: Record<string, string | undefined>): ReportFilters {
  const today = todayISO();
  return {
    from: ISO.test(sp.from ?? "") ? sp.from! : today.slice(0, 8) + "01",
    to: ISO.test(sp.to ?? "") ? sp.to! : today,
    mode: (PAYMENT_MODES as readonly string[]).includes(sp.mode ?? "") ? sp.mode! : "",
    collectedBy: /^\d+$/.test(sp.collectedBy ?? "") ? sp.collectedBy! : "",
    status: ["active", "pending", "cancelled", "rejected", "all"].includes(sp.status ?? "") ? sp.status! : "active",
  };
}

export async function runReport(f: ReportFilters) {
  // Collections are dated by the receipt date entered on the form.
  const where: SQL[] = [gte(members.receiptDate, f.from), lte(members.receiptDate, f.to)];
  if (f.mode) where.push(eq(members.paymentMode, f.mode));
  if (f.collectedBy) where.push(eq(members.createdBy, Number(f.collectedBy)));
  if (f.status !== "all") where.push(eq(members.status, f.status));

  const rows = await db
    .select({ m: members, collectedBy: collector.name, approvedBy: approver.name })
    .from(members)
    .leftJoin(collector, eq(collector.id, members.createdBy))
    .leftJoin(approver, eq(approver.id, members.approvedBy))
    .where(and(...where))
    .orderBy(asc(members.receiptDate), asc(members.membershipNo), asc(members.id));

  // Rejected and cancelled entries are listed but their money isn't counted.
  const counted = rows.filter((r) => r.m.status === "active" || r.m.status === "pending");
  const total = counted.reduce((s, r) => s + r.m.amount, 0);
  const tally = (key: (r: (typeof rows)[number]) => string) => {
    const map = new Map<string, { count: number; amount: number }>();
    for (const r of counted) {
      const k = key(r);
      const t = map.get(k) ?? { count: 0, amount: 0 };
      t.count++;
      t.amount += r.m.amount;
      map.set(k, t);
    }
    return [...map.entries()].map(([label, t]) => ({ label, ...t })).sort((a, b) => b.amount - a.amount);
  };

  return {
    rows,
    total,
    counted: counted.length,
    excluded: rows.length - counted.length,
    byMode: tally((r) => r.m.paymentMode),
    byCollector: tally((r) => r.collectedBy || "—"),
  };
}

export async function listCollectors() {
  return db.select({ id: users.id, name: users.name, username: users.username }).from(users).orderBy(asc(users.name));
}
