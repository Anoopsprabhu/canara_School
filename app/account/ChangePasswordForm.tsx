"use client";

import { useState } from "react";

export default function ChangePasswordForm() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirm) {
      setMsg({ ok: false, text: "The two new passwords don't match" });
      return;
    }
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg({ ok: false, text: data.error ?? "Could not change password" });
      return;
    }
    setCurrent("");
    setNew("");
    setConfirm("");
    setMsg({ ok: true, text: "Password changed. Other devices have been signed out." });
  }

  return (
    <form onSubmit={submit} className="card">
      <div className="card-header">
        <h2 className="card-title">Change password</h2>
      </div>
      <div className="space-y-4 p-5">
        {msg && <div className={msg.ok ? "alert-success" : "alert-error"}>{msg.text}</div>}
        <label className="block">
          <span className="label">Current password</span>
          <input type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} className="input" required />
        </label>
        <label className="block">
          <span className="label">New password (min. 8 characters)</span>
          <input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNew(e.target.value)} className="input" minLength={8} required />
        </label>
        <label className="block">
          <span className="label">Confirm new password</span>
          <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input" minLength={8} required />
        </label>
        <button disabled={busy} className="btn-primary">
          {busy ? "Saving…" : "Change Password"}
        </button>
      </div>
    </form>
  );
}
