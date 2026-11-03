"use client";

import { useState } from "react";
import { amountInWords, formatMemberNo, formatRupees } from "@/lib/format";

type S = { fee: number; membershipNoStart: number; nextMembershipNo: number };

export default function SettingsForm({ initial }: { initial: S }) {
  const [s, setS] = useState<S>(initial);
  const [fee, setFee] = useState(String(initial.fee));
  const [start, setStart] = useState(String(initial.membershipNoStart));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(body: Record<string, unknown>, ok: string) {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg({ ok: false, text: data.error ?? "Could not save" });
      return;
    }
    setS(data);
    setMsg({ ok: true, text: ok });
  }

  const feeNum = Number(fee);

  return (
    <div className="space-y-6">
      {msg && <div className={msg.ok ? "alert-success" : "alert-error"}>{msg.text}</div>}

      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          save({ fee: feeNum }, `Life membership fee is now ₹${formatRupees(feeNum)}.`);
        }}
      >
        <div className="card-header">
          <h2 className="card-title">Life membership fee</h2>
        </div>
        <div className="space-y-4 p-5">
          <label className="block max-w-xs">
            <span className="label">Fee (₹) — applies to new entries only</span>
            <input type="number" min={1} step={1} value={fee} onChange={(e) => setFee(e.target.value)} className="input" required />
          </label>
          {feeNum > 0 && <p className="text-xs text-slate-500">Rupees {amountInWords(feeNum)}</p>}
          <button disabled={busy || feeNum === s.fee || !(feeNum > 0)} className="btn-primary">
            Update fee
          </button>
        </div>
      </form>

      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          save({ membershipNoStart: Number(start) }, "Numbering updated.");
        }}
      >
        <div className="card-header">
          <h2 className="card-title">Membership numbering</h2>
        </div>
        <div className="space-y-4 p-5">
          <p className="text-sm text-slate-600">
            Next membership ID: <b className="text-slate-900 tabular-nums">{formatMemberNo(s.nextMembershipNo)}</b>
          </p>
          <label className="block max-w-xs">
            <span className="label">Start numbering from (after the last paper form)</span>
            <input type="number" min={1} step={1} value={start} onChange={(e) => setStart(e.target.value)} className="input" required />
          </label>
          <button disabled={busy || Number(start) === s.membershipNoStart} className="btn-primary">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
