import { requireUser } from "@/lib/auth";
import { getMembershipFee, getNextMembershipNo, getSetting, getSignatures } from "@/lib/settings";
import SettingsForm from "./SettingsForm";
import SignaturesForm from "./SignaturesForm";

export default async function SettingsPage() {
  await requireUser("settings:manage");
  // Loaded here so the page arrives filled in, with no loading placeholders.
  const [fee, start, nextMembershipNo, signatures] = await Promise.all([
    getMembershipFee(),
    getSetting("membership_no_start"),
    getNextMembershipNo(),
    getSignatures(),
  ]);
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="page-title">Settings</h1>
      <SettingsForm initial={{ fee, membershipNoStart: parseInt(start, 10) || 1, nextMembershipNo }} />
      <SignaturesForm initial={signatures} />
    </div>
  );
}
