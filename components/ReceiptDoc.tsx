import type { Member } from "@/lib/queries";
import { PAYMENT_MODES, amountInWords, formatDate, formatMemberNo, formatRupees, type Signature } from "@/lib/format";
import SignatureBlock from "./SignatureBlock";
import DocHeader from "./DocHeader";
import FitToPage from "./FitToPage";

// "Life Membership Fees Receipt" — a member copy and an office copy on one A4,
// or one copy. With no member it prints blank, for writing by hand.
export default function ReceiptDoc({
  m,
  single = false,
  collectedBy = "",
  signatures = [],
}: {
  m: Member | null;
  single?: boolean;
  collectedBy?: string;
  signatures?: Signature[]; // active authorised signatures
}) {
  return (
    <div className="doc doc-sheet mx-auto w-[210mm] bg-white p-[10mm] shadow-lg">
      <FitToPage maxMm={273}>
        <ReceiptCopy m={m} label={single ? null : "Member Copy"} collectedBy={collectedBy} signatures={signatures} />
        {!single && (
          <>
            <div className="my-[3mm] flex items-center gap-2 text-[11px] text-slate-400">
              <span className="flex-1 border-t border-dashed border-slate-400" />✂ cut here
              <span className="flex-1 border-t border-dashed border-slate-400" />
            </div>
            <ReceiptCopy m={m} label="Office Copy" collectedBy={collectedBy} signatures={signatures} />
          </>
        )}
      </FitToPage>
    </div>
  );
}

function ReceiptCopy({
  m,
  label,
  collectedBy,
  signatures,
}: {
  m: Member | null;
  label: string | null;
  collectedBy: string;
  signatures: Signature[];
}) {
  const no = m ? formatMemberNo(m.membershipNo) : "";
  const stamp = m && m.status !== "active" ? m.status : null;

  return (
    <div className="relative break-inside-avoid rounded border-2 border-brand-800 px-[6mm] py-[4.5mm]">
      {stamp && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="-rotate-12 border-4 border-red-600/60 px-6 py-2 text-5xl font-bold text-red-600/60 uppercase">{stamp}</span>
        </div>
      )}
      <DocHeader compact />
      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex w-[34mm] items-end gap-1 text-[15px]">
          <span className="doc-ink font-bold">No. : </span>
          {m ? <span className="font-mono text-[22px] font-bold text-red-700">{no}</span> : <span className="fill" />}
        </div>
        <div className="doc-ink rounded bg-brand-100 px-4 py-1 text-[15px] font-bold tracking-wide uppercase">
          Life Membership Fees Receipt
        </div>
        <div className="flex w-[48mm] gap-2 text-[15px]">
          <span className="doc-ink">Date :</span>
          <span className="fill text-center">{formatDate(m?.receiptDate)}</span>
        </div>
      </div>
      {label && <div className="mt-1 text-right text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase">{label}</div>}

      <div className="mt-2 space-y-3 text-[15px] italic">
        <div className="flex gap-2">
          <span className="doc-ink shrink-0">Received with thanks from Sri</span>
          <span className="fill not-italic">{m?.name.toUpperCase()}</span>
        </div>
        <div className="flex gap-2">
          <span className="doc-ink shrink-0">a sum of Rupees</span>
          <span className="fill not-italic uppercase">{m ? amountInWords(m.amount) : ""}</span>
        </div>
        <div className="flex gap-2">
          <span className="doc-ink shrink-0">
            by{" "}
            {PAYMENT_MODES.map((mode, i) => (
              <span key={mode}>
                {i > 0 && " / "}
                <span className={mode === m?.paymentMode ? "rounded-full border-2 border-brand-700 px-1.5 font-bold not-italic" : ""}>
                  {mode}
                </span>
              </span>
            ))}
          </span>
          <span className="fill not-italic">{m?.paymentRef}</span>
          <span className="doc-ink shrink-0">dt.</span>
          <span className="fill max-w-[34mm] text-center not-italic">
            {m && m.paymentMode !== "Cash" ? formatDate(m.paymentDate) : ""}
          </span>
        </div>
        <div className="flex gap-2">
          <span className="doc-ink shrink-0">Bank Name</span>
          <span className="fill not-italic">{m?.bankName}</span>
        </div>
        <div className="flex gap-2">
          <span className="doc-ink shrink-0">towards</span>
          <span className="fill font-bold not-italic">LIFE MEMBERSHIP FEES</span>
          <span className="doc-ink shrink-0">Mobile</span>
          <span className="fill max-w-[48mm] not-italic">{m?.mobile1}</span>
        </div>
        <div className="flex gap-2">
          <span className="doc-ink shrink-0">Application No.</span>
          <span className="fill max-w-[40mm] text-center not-italic">{no}</span>
          <span className="doc-ink shrink-0">Collected by</span>
          <span className="fill not-italic">{collectedBy}</span>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div className="flex border-2 border-brand-800 text-brand-900">
          <span className="border-r-2 border-brand-800 px-3 py-1 text-[26px] font-bold">₹</span>
          <span className="min-w-[45mm] px-4 py-1 text-[26px] font-bold" style={{ fontFamily: "Arial, sans-serif" }}>
            {m ? `${formatRupees(m.amount)}/-` : ""}
          </span>
        </div>
        <SignatureBlock signatures={signatures} label="Authorised Signature" italic />
      </div>
    </div>
  );
}
