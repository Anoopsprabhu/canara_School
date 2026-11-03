import { NextRequest, NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";
import { getMembershipFee, getNextMembershipNo, getSetting, getSignatures, setSetting } from "@/lib/settings";
import { isValidAmount, isValidMembershipNo, type Signature } from "@/lib/format";

async function current() {
  return {
    fee: await getMembershipFee(),
    membershipNoStart: parseInt(await getSetting("membership_no_start"), 10) || 1,
    nextMembershipNo: await getNextMembershipNo(),
    signatures: await getSignatures(),
  };
}

function parseSignatures(v: unknown): Signature[] | string {
  if (!Array.isArray(v) || v.length !== 2) return "Invalid signatures";
  const out: Signature[] = [];
  for (const [i, raw] of v.entries()) {
    const r = (raw ?? {}) as Record<string, unknown>;
    const sig: Signature = {
      name: String(r.name ?? "").trim().slice(0, 100),
      title: String(r.title ?? "").trim().slice(0, 100),
      imageKey: String(r.imageKey ?? ""),
      active: r.active === true,
    };
    if (sig.imageKey && (!sig.imageKey.startsWith("membership/signatures/") || sig.imageKey.includes(".."))) {
      return "Invalid signature image";
    }
    if (sig.active && !sig.imageKey) return `Upload signature ${i + 1} before making it active`;
    if (sig.active && !sig.name) return `Enter the name for signature ${i + 1}`;
    out.push(sig);
  }
  return out;
}

export async function GET() {
  const { error } = await apiUser("settings:manage");
  if (error) return error;
  return NextResponse.json(await current());
}

export async function PUT(req: NextRequest) {
  const { user, error } = await apiUser("settings:manage");
  if (error) return error;
  const body = await req.json();

  if (body.fee !== undefined) {
    const fee = Number(body.fee);
    if (!isValidAmount(fee)) {
      return NextResponse.json({ error: "Enter a valid fee in whole rupees" }, { status: 400 });
    }
    await setSetting("membership_fee", String(fee), user.id);
  }
  if (body.membershipNoStart !== undefined) {
    const start = Number(body.membershipNoStart);
    if (!isValidMembershipNo(start)) {
      return NextResponse.json({ error: "Enter a valid starting number" }, { status: 400 });
    }
    await setSetting("membership_no_start", String(start), user.id);
  }
  if (body.signatures !== undefined) {
    const sigs = parseSignatures(body.signatures);
    if (typeof sigs === "string") return NextResponse.json({ error: sigs }, { status: 400 });
    await setSetting("signatures", JSON.stringify(sigs), user.id);
  }
  return NextResponse.json(await current());
}
