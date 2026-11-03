import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, isUniqueViolation } from "@/lib/db";
import { members } from "@/lib/schema";
import { apiUser } from "@/lib/auth";
import { checkUploads, parseMemberInput, withMembershipNo } from "@/lib/members";
import { formatMemberNo, isValidAmount, isValidMembershipNo } from "@/lib/format";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const body = await req.json();
  const action: string = body.action ?? "update";
  const reason = String(body.reason ?? "").trim();

  const [current] = await db.select({ status: members.status }).from(members).where(eq(members.id, id));
  if (!current) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  if (action === "approve") {
    const { user, error } = await apiUser("member:approve");
    if (error) return error;
    if (current.status !== "pending") {
      return NextResponse.json({ error: "Only entries awaiting approval can be approved" }, { status: 400 });
    }
    // The membership number is allotted now, at approval.
    const res = await withMembershipNo((membershipNo) =>
      db
        .update(members)
        .set({ membershipNo, status: "active", approvedBy: user.id, approvedAt: new Date(), updatedBy: user.id, updatedAt: new Date() })
        .where(and(eq(members.id, id), eq(members.status, "pending")))
        .returning({ id: members.id, membershipNo: members.membershipNo })
    );
    if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.status });
    if (!res.ok[0]) return NextResponse.json({ error: "This entry was already handled" }, { status: 409 });
    return NextResponse.json(res.ok[0]);
  }

  if (action === "reject" || action === "cancel" || action === "restore") {
    const { user, error } = await apiUser(action === "reject" ? "member:approve" : "member:cancel");
    if (error) return error;
    const allowed: Record<typeof action, string[]> = { reject: ["pending"], cancel: ["active"], restore: ["cancelled", "rejected"] };
    if (!allowed[action].includes(current.status)) {
      return NextResponse.json({ error: "That action doesn't apply to this entry" }, { status: 400 });
    }
    if (action !== "restore" && !reason) {
      return NextResponse.json({ error: "Give a reason" }, { status: 400 });
    }
    // A restored rejection goes back to the approval queue; a restored
    // cancellation keeps its number and is active again.
    const status =
      action === "reject" ? "rejected" : action === "cancel" ? "cancelled" : current.status === "rejected" ? "pending" : "active";
    await db
      .update(members)
      .set({ status, cancelReason: action === "restore" ? "" : reason, updatedBy: user.id, updatedAt: new Date() })
      .where(eq(members.id, id));
    return NextResponse.json({ ok: true, status });
  }

  const { user, error } = await apiUser("member:edit");
  if (error) return error;
  const parsed = parseMemberInput(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const uploadError = await checkUploads(parsed.data);
  if (uploadError) return NextResponse.json({ error: uploadError }, { status: 400 });

  const extra: { membershipNo?: number; amount?: number } = {};
  if (current.status !== "pending" && body.membershipNo !== undefined && body.membershipNo !== "") {
    const n = Number(body.membershipNo);
    if (!isValidMembershipNo(n)) return NextResponse.json({ error: "Enter a valid membership number" }, { status: 400 });
    extra.membershipNo = n;
  }
  if (body.amount !== undefined && body.amount !== "") {
    const a = Number(body.amount);
    if (!isValidAmount(a)) return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });
    extra.amount = a;
  }

  try {
    const [row] = await db
      .update(members)
      .set({ ...parsed.data, ...extra, updatedBy: user.id, updatedAt: new Date() })
      .where(eq(members.id, id))
      .returning({ id: members.id, membershipNo: members.membershipNo });
    return NextResponse.json(row);
  } catch (e) {
    if (isUniqueViolation(e) && extra.membershipNo) {
      return NextResponse.json(
        { error: `Membership No. ${formatMemberNo(extra.membershipNo)} is already in use` },
        { status: 409 }
      );
    }
    throw e;
  }
}
