import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { members, settings } from "./schema";
import type { Signature } from "./format";

export const DEFAULT_FEE = 1000;

export async function getSetting(key: string): Promise<string> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key));
  return row?.value ?? "";
}

export async function setSetting(key: string, value: string, userId: number) {
  await db
    .insert(settings)
    .values({ key, value, updatedBy: userId })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedBy: userId, updatedAt: new Date() },
    });
}

export async function getMembershipFee(): Promise<number> {
  const n = parseInt(await getSetting("membership_fee"), 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_FEE;
}

// The super admin can set where numbering continues from (e.g. after the last
// paper form). The next number is whichever is higher: that start, or one past
// the highest number already used.
export async function getNextMembershipNo(): Promise<number> {
  const start = parseInt(await getSetting("membership_no_start"), 10) || 1;
  const [row] = await db
    .select({ max: sql<number | null>`max(${members.membershipNo})` })
    .from(members);
  return Math.max(start, (row?.max ?? 0) + 1);
}

const EMPTY_SIGNATURE: Signature = { name: "", title: "", imageKey: "", active: false };

// Always two slots, stored together as JSON under "signatures".
export async function getSignatures(): Promise<Signature[]> {
  let saved: Partial<Signature>[] = [];
  try {
    saved = JSON.parse((await getSetting("signatures")) || "[]");
  } catch {
    saved = [];
  }
  return [0, 1].map((i) => ({ ...EMPTY_SIGNATURE, ...(saved[i] ?? {}) }));
}

export async function getActiveSignatures(): Promise<Signature[]> {
  return (await getSignatures()).filter((s) => s.active && s.imageKey);
}
