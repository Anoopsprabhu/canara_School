"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Action = "approve" | "reject" | "cancel" | "restore";

// Reject and cancel ask for a reason, which is kept on the record.
const REASONS: Partial<Record<Action, { title: string; hint: string; confirm: string }>> = {
  reject: { title: "Reject this entry", hint: "e.g. payment not received, duplicate entry", confirm: "Reject entry" },
  cancel: { title: "Cancel this membership", hint: "e.g. duplicate entry, refund", confirm: "Cancel membership" },
};

export default function MemberStatusActions({
  id,
  status,
  canApprove,
  canCancel,
  compact = false,
}: {
  id: number;
  status: string;
  canApprove: boolean;
  canCancel: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [asking, setAsking] = useState<Action | null>(null);
  const [reason, setReason] = useState("");

  async function run(action: Action, why = "") {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/members/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason: why }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Action failed");
      return;
    }
    setAsking(null);
    setReason("");
    router.refresh();
  }

  function start(action: Action) {
    if (REASONS[action]) {
      setError("");
      setAsking(action);
    } else {
      run(action);
    }
  }

  const size = compact ? "btn-sm" : "";
  const dialog = asking && REASONS[asking];
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === "pending" && canApprove && (
          <>
            <button onClick={() => start("approve")} disabled={busy} className={`btn-primary ${size}`}>
              Approve
            </button>
            <button onClick={() => start("reject")} disabled={busy} className={`btn-danger-outline ${size}`}>
              Reject
            </button>
          </>
        )}
        {status === "active" && canCancel && (
          <button onClick={() => start("cancel")} disabled={busy} className="btn-danger-outline btn-sm">
            Cancel membership
          </button>
        )}
        {(status === "cancelled" || status === "rejected") && canCancel && (
          <button onClick={() => start("restore")} disabled={busy} className="btn-secondary btn-sm">
            {status === "rejected" ? "Send back for approval" : "Restore membership"}
          </button>
        )}
      </div>
      {error && !dialog && <p className="text-xs font-medium text-red-600">{error}</p>}

      {dialog && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" onClick={() => !busy && setAsking(null)}>
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="reason-title"
            className="card w-full max-w-md p-5 text-left text-sm text-slate-700"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              if (reason.trim()) run(asking, reason.trim());
            }}
          >
            <h2 id="reason-title" className="section-title">
              {dialog.title}
            </h2>
            <label className="mt-4 block">
              <span className="label">Reason *</span>
              <textarea
                autoFocus
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={dialog.hint}
                className="input resize-none"
              />
            </label>
            {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setAsking(null)} disabled={busy} className="btn-secondary">
                Back
              </button>
              <button disabled={busy || !reason.trim()} className="btn-danger">
                {busy ? "Saving…" : dialog.confirm}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
