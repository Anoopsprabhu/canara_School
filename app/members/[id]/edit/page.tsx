import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/roles";
import { getMember } from "@/lib/queries";
import { getMembershipFee } from "@/lib/settings";
import { formatMemberNo } from "@/lib/format";
import MemberForm from "@/components/MemberForm";

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("member:edit");
  const row = await getMember(Number((await params).id));
  if (!row) notFound();
  const m = row.member;
  const { id, membershipNo, amount, status, cancelReason, createdBy, updatedBy, approvedBy, approvedAt, createdAt, updatedAt, ...fields } = m;
  void cancelReason; void createdBy; void updatedBy; void approvedBy; void approvedAt; void createdAt; void updatedAt;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">
          {status === "pending" ? "Edit entry" : `Edit member ${formatMemberNo(membershipNo)}`}
        </h1>
        <p className="page-subtitle">
          {m.name}
          {status === "pending" && " · awaiting approval"}
        </p>
      </div>
      <MemberForm
        memberId={id}
        initial={{ ...fields, membershipNo: membershipNo == null ? "" : String(membershipNo), amount: String(amount) }}
        fee={await getMembershipFee()}
        canSetNumber={can(user.role, "member:setNumber") && status !== "pending"}
        collectedBy={row.createdByName || "—"}
      />
    </div>
  );
}
