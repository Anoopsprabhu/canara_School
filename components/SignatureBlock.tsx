/* eslint-disable @next/next/no-img-element */
import type { Signature } from "@/lib/format";

// The authorised-signature spot on a printed form: each active signatory's
// image sits on the dotted line with their name and designation beneath, or
// an empty line to sign by hand when none is active.
export default function SignatureBlock({
  signatures,
  label,
  italic = false,
}: {
  signatures: Signature[];
  label: string;
  italic?: boolean;
}) {
  if (!signatures.length) {
    return (
      <div className={`doc-ink w-[60mm] border-t border-dotted border-slate-600 pt-1 text-center text-[14px] ${italic ? "italic" : ""}`}>
        {label}
      </div>
    );
  }
  return (
    <div className="flex gap-[6mm]">
      {signatures.map((s) => (
        <div key={s.imageKey} className="w-[50mm] text-center">
          <img src={`/api/files/${s.imageKey}`} alt="" className="signature-img mx-auto h-[11mm] w-full" />
          <div className="doc-ink border-t border-dotted border-slate-600 pt-0.5 text-[12.5px] leading-tight">
            <div className="font-bold not-italic">{s.name}</div>
            <div className={italic ? "italic" : ""}>{s.title || label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
