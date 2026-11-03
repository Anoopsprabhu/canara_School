"use client";

import { useRef, useState } from "react";
import CameraCapture from "./CameraCapture";

export function fileUrl(key: string) {
  return `/api/files/${key}`;
}

async function uploadToServer(file: File, kind: "photo" | "proof"): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("kind", kind);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.key;
}

// Passport-size member photo: choose a file or use the camera, crop to 3:4, upload.
export function PhotoUpload({
  value,
  onChange,
  required = false,
}: {
  value: string;
  onChange: (key: string) => void;
  required?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(value ? fileUrl(value) : null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setError("");
    setUploading(true);
    const local = URL.createObjectURL(file);
    setPreview(local);
    try {
      const key = await uploadToServer(file, "photo");
      onChange(key);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setPreview(value ? fileUrl(value) : null);
    } finally {
      setUploading(false);
    }
  }

  function pick(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image (JPG, PNG or WEBP)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setCropSrc(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <span className="label">Photograph{required && " *"}</span>
      <div className="flex gap-4">
        <div className="relative grid h-40 w-30 shrink-0 place-items-center overflow-hidden rounded-lg border-2 border-dashed border-brand-200 bg-brand-50">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Member photo" className="h-full w-full object-cover" />
          ) : (
            <span className="px-2 text-center text-xs text-slate-400">Passport size photo</span>
          )}
          {uploading && (
            <span className="absolute inset-0 grid place-items-center bg-black/40 text-xs font-bold text-white">Uploading…</span>
          )}
        </div>
        <div className="flex flex-col justify-center gap-2">
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="btn-secondary btn-sm">
            {preview ? "Change photo" : "Choose photo"}
          </button>
          <button type="button" onClick={() => setCameraOpen(true)} disabled={uploading} className="btn-secondary btn-sm">
            Use camera
          </button>
          {value && !uploading && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setPreview(null);
              }}
              className="cursor-pointer text-xs font-semibold text-red-600 hover:underline"
            >
              Remove
            </button>
          )}
          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pick(f);
          e.target.value = "";
        }}
      />
      {(cameraOpen || cropSrc) && (
        <CameraCapture
          initialImage={cropSrc ?? undefined}
          onCaptured={(file) => {
            setCameraOpen(false);
            setCropSrc(null);
            upload(file);
          }}
          onClose={() => {
            setCameraOpen(false);
            setCropSrc(null);
          }}
        />
      )}
    </div>
  );
}

// Address proof: image or PDF, uploaded as-is.
export function ProofUpload({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setError("");
    if (file.size > 10 * 1024 * 1024) {
      setError("File must be under 10 MB");
      return;
    }
    setUploading(true);
    try {
      onChange(await uploadToServer(file, "proof"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <span className="label">Address proof — Aadhaar / ID / bill (optional)</span>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="btn-secondary btn-sm">
          {uploading ? "Uploading…" : value ? "Replace file" : "Attach proof"}
        </button>
        {value && !uploading && (
          <>
            <a href={fileUrl(value)} target="_blank" rel="noreferrer" className="text-xs font-semibold text-brand-700 hover:underline">
              View attached file ↗
            </a>
            <button type="button" onClick={() => onChange("")} className="cursor-pointer text-xs font-semibold text-red-600 hover:underline">
              Remove
            </button>
          </>
        )}
      </div>
      {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
