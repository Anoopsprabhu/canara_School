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

// Loads a picked image so we know the browser can draw it (HEIC can't be drawn
// outside Safari) before showing the cropper or shrinking it.
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("unreadable"));
    img.src = src;
  });
}

const UNREADABLE_IMAGE = "This photo format can't be opened here (e.g. HEIC). Choose a JPG or PNG, or use the camera.";

// Phone photos of an ID are often 5–20 MB; shrink them so they upload quickly
// and stay well under the server's 10 MB limit. PDFs are sent as they are.
async function shrinkImage(file: File, maxSide = 2000): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("unreadable"))), "image/jpeg", 0.85)
    );
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
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

  function closeCamera() {
    setCameraOpen(false);
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  // Any size is fine here: only the cropped, passport-size JPEG is uploaded.
  async function pick(file: File) {
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image (JPG, PNG or WEBP)");
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      await loadImage(url);
      setCropSrc(url);
    } catch {
      URL.revokeObjectURL(url);
      setError(UNREADABLE_IMAGE);
    }
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
            closeCamera();
            upload(file);
          }}
          onClose={closeCamera}
        />
      )}
    </div>
  );
}

// Address proof: an image (shrunk if large) or a PDF.
export function ProofUpload({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(picked: File) {
    setError("");
    const isPdf = picked.type === "application/pdf";
    if (!isPdf && !picked.type.startsWith("image/")) {
      setError("Attach a photo (JPG, PNG) or a PDF");
      return;
    }
    setUploading(true);
    try {
      let file = picked;
      if (!isPdf) {
        try {
          file = await shrinkImage(picked);
        } catch {
          throw new Error(UNREADABLE_IMAGE);
        }
      }
      if (file.size > 10 * 1024 * 1024) throw new Error("The PDF must be under 10 MB");
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
