import { requireUser } from "@/lib/auth";
import { can } from "@/lib/roles";
import { getMembershipFee, getNextMembershipNo } from "@/lib/settings";
import MemberForm from "@/components/MemberForm";

export default async function NewMemberPage() {
  const user = await requireUser("member:create");
  const [fee, nextNo] = await Promise.all([getMembershipFee(), getNextMembershipNo()]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">New life member</h1>
        <p className="page-subtitle">Application for admission as a life member</p>
      </div>
      <MemberForm
        fee={fee}
        nextNo={nextNo}
        canSetNumber={can(user.role, "member:setNumber")}
        needsApproval={!can(user.role, "member:approve")}
        collectedBy={user.name || user.username}
      />
    </div>
  );
}
