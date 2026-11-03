"use client";

import { useRef, useState } from "react";
import type { Signature } from "@/lib/format";
import CameraCapture from "@/components/CameraCapture";

// Two authorised signatories. Each active one is printed on the application
// form and the receipt above "Authorised Signature".
export default function SignaturesForm({ initial }: { initial: Signature[] }) {
  const [sigs, setSigs] = useState<Signature[]>(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  function update(i: number, patch: Partial<Signature>) {
    setSigs((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signatures: sigs }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg({ ok: false, text: data.error ?? "Could not save" });
      return;
    }
    setSigs(data.signatures);
    setSaved(JSON.stringify(data.signatures));
    setMsg({ ok: true, text: "Signatures saved." });
  }

  const dirty = JSON.stringify(sigs) !== saved;

  return (
    <section className="card">
      <div className="card-header justify-between">
        <h2 className="card-title">Authorised signatures</h2>
        <span className="text-xs text-slate-500">Active signatures print on applications and receipts</span>
      </div>
      <div className="space-y-4 p-5">
        {msg && <div className={msg.ok ? "alert-success" : "alert-error"}>{msg.text}</div>}
        <div className="grid gap-4 md:grid-cols-2">
          {sigs.map((s, i) => (
            <SignatureSlot key={i} index={i} sig={s} onChange={(patch) => update(i, patch)} />
          ))}
        </div>
        <button onClick={save} disabled={busy || !dirty} className="btn-primary">
          {busy ? "Saving…" : "Save signatures"}
        </button>
      </div>
    </section>
  );
}

function SignatureSlot({
  index,
  sig,
  onChange,
}: {
  index: number;
  sig: Signature;
  onChange: (patch: Partial<Signature>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", "signature");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok) {
      setError(data.error ?? "Upload failed");
      return;
    }
    onChange({ imageKey: data.key });
  }

  return (
    <div className={`rounded-lg border p-4 ${sig.active ? "border-brand-300 bg-brand-50/40" : "border-slate-200"}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-900">Signature {index + 1}</span>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <span className={sig.active ? "font-medium text-brand-800" : "text-slate-500"}>
            {sig.active ? "Active" : "Disabled"}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={sig.active}
            onClick={() => onChange({ active: !sig.active })}
            className={`relative h-5 w-9 cursor-pointer rounded-full transition ${sig.active ? "bg-brand-700" : "bg-slate-300"}`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${sig.active ? "left-4.5" : "left-0.5"}`}
            />
          </button>
        </label>
      </div>

      <div className="grid h-24 place-items-center rounded-md border border-dashed border-slate-300 bg-white">
        {sig.imageKey ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/files/${sig.imageKey}`} alt={`Signature ${index + 1}`} className="signature-img h-20 w-full p-1" />
        ) : (
          <span className="text-xs text-slate-400">No signature uploaded</span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-3">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="btn-secondary btn-sm">
          {uploading ? "Uploading…" : sig.imageKey ? "Replace image" : "Upload signature"}
        </button>
        {sig.imageKey && (
          <button
            type="button"
            onClick={() => onChange({ imageKey: "", active: false })}
            className="cursor-pointer text-xs font-medium text-red-600 hover:underline"
          >
            Remove
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">Name</span>
          <input value={sig.name} onChange={(e) => onChange({ name: e.target.value })} className="input" />
        </label>
        <label className="block">
          <span className="label">Designation</span>
          <input
            value={sig.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="e.g. President"
            className="input"
          />
        </label>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          const reader = new FileReader();
          reader.onload = (ev) => setCropSrc(ev.target?.result as string);
          reader.readAsDataURL(f);
        }}
      />
      {cropSrc && (
        <CameraCapture
          aspect={3}
          initialImage={cropSrc}
          onCaptured={(file) => {
            setCropSrc(null);
            upload(file);
          }}
          onClose={() => setCropSrc(null)}
        />
      )}
    </div>
  );
}
