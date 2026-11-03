"use client";

import { useCallback, useState } from "react";
import { ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS, type Role } from "@/lib/roles";
import { formatDateTime } from "@/lib/format";

export type UserRow = {
  id: number;
  name: string;
  username: string;
  role: Role;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

type Credentials = { title: string; username: string; password: string };

function fmt(ts: string | null) {
  return ts ? formatDateTime(ts, true) : "Never";
}

export default function UsersManager({ meId, initial }: { meId: number; initial: UserRow[] }) {
  const [rows, setRows] = useState<UserRow[]>(initial);
  const [error, setError] = useState("");
  const [creds, setCreds] = useState<Credentials | null>(null);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      fetch("/api/admin/users")
        .then((res) => (res.ok ? res.json() : null))
        .then((data: UserRow[] | null) => {
          if (data) setRows(data);
        }),
    []
  );

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, username, role }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create user");
      return;
    }
    setCreds({ title: `Login created for ${name}`, username: data.username, password: data.password });
    setName("");
    setUsername("");
    setRole("staff");
    load();
  }

  async function act(u: UserRow, body: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    setError("");
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Action failed");
      load();
      return;
    }
    if (body.action === "reset_password") {
      setCreds({ title: `New password for ${u.name || u.username}`, username: data.username, password: data.password });
    }
    load();
  }

  return (
    <div className="space-y-6">
      {creds && <CredentialsCard creds={creds} onClose={() => setCreds(null)} />}
      {error && <div className="alert-error">{error}</div>}

      <form onSubmit={create} className="card">
        <div className="card-header">
          <h2 className="card-title">Add a user</h2>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-end">
          <label className="block">
            <span className="label">Full name *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="e.g. Vivek Pai" required />
          </label>
          <label className="block">
            <span className="label">Username (optional)</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className="input"
              placeholder="auto from name"
              autoCapitalize="none"
            />
          </label>
          <label className="block">
            <span className="label">Role *</span>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="input">
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
          <button disabled={busy} className="btn-primary">
            {busy ? "Creating…" : "Create login"}
          </button>
          <p className="text-xs text-slate-500 md:col-span-4">
            <b>{ROLE_LABELS[role]}:</b> {ROLE_DESCRIPTIONS[role]}. A password is generated and shown once — share it with
            the person; they can change it from <i>My Account</i>.
          </p>
        </div>
      </form>

      <ul className="list-card">
        {rows.map((u) => (
          <li key={u.id} className={`flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 ${u.active ? "" : "bg-slate-50/60"}`}>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-semibold text-brand-800 uppercase">
              {(u.name || u.username).charAt(0)}
            </div>
            <div className="min-w-40 flex-1">
              <div className="flex items-center gap-2">
                <span className={`font-medium ${u.active ? "text-slate-900" : "text-slate-500"}`}>{u.name || "—"}</span>
                {u.id === meId && <span className="badge-brand">You</span>}
                {!u.active && <span className="badge-red">Revoked</span>}
              </div>
              <div className="text-xs text-slate-500">
                {u.username} · {u.lastLoginAt ? `last sign-in ${fmt(u.lastLoginAt)}` : "never signed in"}
              </div>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
              <select
                value={u.role}
                disabled={u.id === meId}
                aria-label={`Role for ${u.username}`}
                onChange={(e) => act(u, { action: "update", role: e.target.value })}
                className="input w-auto py-1 pr-7 pl-2.5 text-xs"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              <button
                onClick={() =>
                  act(u, { action: "reset_password" }, `Generate a new password for ${u.username}? Their current password stops working.`)
                }
                className="btn-secondary btn-sm"
              >
                Reset password
              </button>
              {u.id !== meId &&
                (u.active ? (
                  <button
                    onClick={() => act(u, { action: "revoke" }, `Revoke access for ${u.username}? They will be signed out immediately.`)}
                    className="btn-danger-outline btn-sm"
                  >
                    Revoke
                  </button>
                ) : (
                  <button onClick={() => act(u, { action: "restore" })} className="btn-secondary btn-sm">
                    Restore
                  </button>
                ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CredentialsCard({ creds, onClose }: { creds: Credentials; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const text = `Canara Old Boys' Membership Portal\nUsername: ${creds.username}\nPassword: ${creds.password}`;
  return (
    <div className="card border-emerald-300 bg-emerald-50/50">
      <div className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-emerald-900">{creds.title}</p>
            <p className="text-xs text-emerald-800/80">Copy these now — the password is not shown again.</p>
          </div>
          <button onClick={onClose} className="cursor-pointer text-lg font-bold text-slate-400 hover:text-slate-600" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="grid gap-2 rounded-xl border border-emerald-200 bg-white p-4 font-mono text-sm sm:grid-cols-2">
          <div>
            <span className="text-xs text-slate-500">Username</span>
            <div className="font-bold">{creds.username}</div>
          </div>
          <div>
            <span className="text-xs text-slate-500">Password</span>
            <div className="font-bold">{creds.password}</div>
          </div>
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(text);
            setCopied(true);
          }}
          className="btn-secondary btn-sm"
        >
          {copied ? "✓ Copied" : "Copy username & password"}
        </button>
      </div>
    </div>
  );
}
