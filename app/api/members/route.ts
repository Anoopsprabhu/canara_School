import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { members } from "@/lib/schema";
import { apiUser } from "@/lib/auth";
import { can } from "@/lib/roles";
import { checkUploads, parseMemberInput, withMembershipNo } from "@/lib/members";
import { getMembershipFee } from "@/lib/settings";
import { STATUS_LABELS, formatMemberNo, isValidAmount, isValidMembershipNo } from "@/lib/format";

export async function POST(req: NextRequest) {
  const { user, error } = await apiUser("member:create");
  if (error) return error;

  const body = await req.json();
  const parsed = parseMemberInput(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const data = parsed.data;
  const uploadError = await checkUploads(data);
  if (uploadError) return NextResponse.json({ error: uploadError }, { status: 400 });

  // Same mobile already registered or waiting? Ask before creating a second one.
  if (!body.confirmDuplicate) {
    const [dup] = await db
      .select({ id: members.id, membershipNo: members.membershipNo, name: members.name, status: members.status })
      .from(members)
      .where(
        and(
          inArray(members.status, ["active", "pending"]),
          or(eq(members.mobile1, data.mobile1), eq(members.mobile2, data.mobile1))
        )
      )
      .limit(1);
    if (dup) {
      const which =
        dup.status === "pending" ? "an entry awaiting approval" : `Membership No. ${formatMemberNo(dup.membershipNo)}`;
      return NextResponse.json(
        { error: `Mobile ${data.mobile1} is already registered to ${dup.name} (${which}).`, duplicate: dup },
        { status: 409 }
      );
    }
  }

  // Only the super admin may key in an old paper form's number or a different fee.
  const privileged = can(user.role, "member:setNumber");
  let amount = await getMembershipFee();
  if (privileged && body.amount !== undefined && body.amount !== "") {
    const a = Number(body.amount);
    if (!isValidAmount(a)) return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });
    amount = a;
  }
  let fixedNo: number | null = null;
  if (privileged && body.membershipNo !== undefined && body.membershipNo !== "") {
    fixedNo = Number(body.membershipNo);
    if (!isValidMembershipNo(fixedNo)) {
      return NextResponse.json({ error: "Enter a valid membership number" }, { status: 400 });
    }
  }

  const values = { ...data, amount, createdBy: user.id, updatedBy: user.id };
  const returning = { id: members.id, membershipNo: members.membershipNo, status: members.status };

  // Everyone else's entries wait for the super admin, without a number yet.
  if (!can(user.role, "member:approve")) {
    const [created] = await db.insert(members).values({ ...values, status: "pending" }).returning(returning);
    return NextResponse.json({ ...created, statusLabel: STATUS_LABELS.pending }, { status: 201 });
  }

  const res = await withMembershipNo(
    (membershipNo) =>
      db
        .insert(members)
        .values({ ...values, membershipNo, status: "active", approvedBy: user.id, approvedAt: new Date() })
        .returning(returning),
    fixedNo
  );
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.ok[0], { status: 201 });
}
