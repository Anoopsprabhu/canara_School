"use client";

export default function PrintButton({ label = "Print", className = "btn-primary" }: { label?: string; className?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      {label}
    </button>
  );
}
