import { requireUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/roles";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="page-title">My account</h1>
        <p className="page-subtitle">
          {user.username} · {ROLE_LABELS[user.role]}
        </p>
      </div>
      <ChangePasswordForm />
    </div>
  );
}
