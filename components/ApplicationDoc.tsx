/* eslint-disable @next/next/no-img-element */
import type { Member } from "@/lib/queries";
import { SCHOOLS, ageFrom, formatDate, formatMemberNo, formatPlace, formatRupees, type Signature } from "@/lib/format";
import SignatureBlock from "./SignatureBlock";
import DocHeader from "./DocHeader";
import FitToPage from "./FitToPage";

// The "Application for Admission as a Life Member" sheet. With no member it
// prints blank, for filling in by hand.
export default function ApplicationDoc({
  m,
  collectedBy = "",
  approvedBy = "",
  signatures = [],
}: {
  m: Member | null;
  collectedBy?: string;
  approvedBy?: string;
  signatures?: Signature[]; // active authorised signatures, for approved members only
}) {
  const pending = m?.status === "pending";
  const age = m ? ageFrom(m.dob, m.applicationDate) : null;
  const addressLines = m ? [m.address, formatPlace(m)].filter(Boolean).join("\n").split("\n") : [];
  // Blank forms get three ruled lines to write on; filled ones only what they need.
  while (addressLines.length < (m ? 2 : 3)) addressLines.push("");

  return (
    <div className="doc doc-sheet mx-auto w-[210mm] min-h-[297mm] bg-white p-[12mm] shadow-lg">
      <FitToPage maxMm={273}>
        <DocHeader />

        <div className="mt-4 text-center">
          <span className="doc-ink border-b-2 border-brand-800 text-[19px] font-bold tracking-wide uppercase">
            Application for Admission as a Life Member
          </span>
        </div>

        <div className="mt-3 flex items-start justify-between">
          <div className="space-y-2 text-[16px]">
            <div className="flex items-end gap-2">
              <span className="doc-ink">Membership / Application No.: </span>
              {m && !pending ? (
                <span className="font-mono text-[22px] font-bold text-red-700">{formatMemberNo(m.membershipNo)}</span>
              ) : (
                <span className="fill inline-block w-[30mm] text-[13px] text-slate-500">{pending ? "on approval" : ""}</span>
              )}
            </div>
            {m && m.status !== "active" && !pending && <div className="font-bold text-red-700 uppercase">{m.status}</div>}
          </div>
          <div className="grid h-[45mm] w-[35mm] place-items-center overflow-hidden border border-slate-500">
            {m?.photoKey ? (
              <img src={`/api/files/${m.photoKey}`} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="px-2 text-center text-[11px] text-slate-400">Affix passport size photo</span>
            )}
          </div>
        </div>

        <ol className="mt-3 space-y-3 text-[15.5px]">
          <Line n={1} label="Name of the Applicant" value={m?.name.toUpperCase()} />
          <Line n={2} label="Son of" value={m?.fatherName.toUpperCase()} />
          {m ? (
            <Line n={3} label="School & Year of Passing" value={[m.school, m.yearOfPassing].filter(Boolean).join("  /  ")} />
          ) : (
            <li className="flex gap-3">
              <span className="doc-ink w-6 shrink-0">3.</span>
              <span className="doc-ink w-[62mm] shrink-0">School & Year of Passing</span>
              <span className="doc-ink">:</span>
              <span className="flex-1 space-y-2">
                <span className="doc-ink flex items-end gap-x-5 text-[14px]">
                  {[...SCHOOLS.map((s) => s.replace("Canara High School ", "")), "Others"].map((s) => (
                    <span key={s} className="inline-flex shrink-0 items-center gap-1.5">
                      <span className="inline-block h-3.5 w-3.5 border border-slate-600" />
                      {s}
                    </span>
                  ))}
                  <span className="fill -ml-3 flex-1" />
                </span>
                <span className="flex gap-2">
                  <span className="doc-ink">Year :</span>
                  <span className="fill w-[35mm] flex-none" />
                </span>
              </span>
            </li>
          )}
          <Line n={4} label="D.O.B. & Age" value={m?.dob ? `${formatDate(m.dob)}${age !== null ? `  /  ${age} years` : ""}` : ""} />
          <li className="flex gap-3">
            <span className="doc-ink w-6 shrink-0">5.</span>
            <span className="doc-ink w-[62mm] shrink-0">
              Full Postal Address (Pincode)
              <br />
              <span className="text-[13px]">(Attach Proof)</span>
            </span>
            <span className="doc-ink">:</span>
            <span className="flex-1 space-y-2">
              {addressLines.map((l, i) => (
                <span key={i} className="fill block">
                  {l}
                </span>
              ))}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="doc-ink w-6 shrink-0">6.</span>
            <span className="doc-ink w-[62mm] shrink-0">Mobile No.</span>
            <span className="doc-ink">:</span>
            <span className="doc-ink">1.</span>
            <span className="fill">{m?.mobile1}</span>
            <span className="doc-ink">2.</span>
            <span className="fill">{m?.mobile2}</span>
          </li>
          <Line n={7} label="E-mail Id." value={m?.email} />
        </ol>

        <p className="mt-6 text-[15.5px] leading-relaxed" style={{ textIndent: "3em" }}>
          I hereby express my willingness to become a Life Member of the association and undertake to abide by the bye-laws
          of the association for the time being in force.
        </p>

        <div className="mt-6 flex items-end justify-between text-[15.5px]">
          <div className="space-y-3">
            <div className="flex w-[70mm] gap-2">
              <span className="doc-ink">Date :</span>
              <span className="fill">{formatDate(m?.applicationDate)}</span>
            </div>
            <div className="flex w-[70mm] gap-2">
              <span className="doc-ink">Place :</span>
              <span className="fill">{m?.place}</span>
            </div>
          </div>
          <div className="doc-ink w-[60mm] border-t border-dotted border-slate-600 pt-1 text-center">Signature of the Applicant</div>
        </div>

        <div className="mt-5 break-inside-avoid border-t-2 border-dashed border-slate-400 pt-4">
          <div className="doc-ink text-center text-[16px] font-bold tracking-wider uppercase">For Office Use</div>
          <div className="mt-4 flex gap-3 text-[15.5px]">
            <span className="doc-ink">Receipt No.</span>
            <span className="fill text-center">{m && !pending ? formatMemberNo(m.membershipNo) : ""}</span>
            <span className="doc-ink">dated</span>
            <span className="fill text-center">{m && !pending ? formatDate(m.receiptDate) : ""}</span>
            <span className="doc-ink">for Rs.</span>
            <span className="fill text-center">{m ? `${formatRupees(m.amount)}/-` : ""}</span>
          </div>
          {m && (
            <div className="mt-2 text-[13px] text-slate-600">
              Paid by {m.paymentMode}
              {m.paymentRef && ` · Ref: ${m.paymentRef}`}
              {m.paymentMode !== "Cash" && m.paymentDate && ` dt. ${formatDate(m.paymentDate)}`}
              {m.bankName && ` · ${m.bankName}`}
              {collectedBy && ` · Collected by ${collectedBy}`}
              {approvedBy && ` · Approved by ${approvedBy}`}
              {m.remarks && ` · ${m.remarks}`}
            </div>
          )}
          <div className={`flex justify-end ${signatures.length ? "mt-2" : "mt-10"}`}>
            <SignatureBlock signatures={signatures} label="Signature of Authorised Person" />
          </div>
        </div>
      </FitToPage>
    </div>
  );
}

function Line({ n, label, value }: { n: number; label: string; value?: string }) {
  return (
    <li className="flex gap-3">
      <span className="doc-ink w-6 shrink-0">{n}.</span>
      <span className="doc-ink w-[62mm] shrink-0">{label}</span>
      <span className="doc-ink">:</span>
      <span className="fill">{value}</span>
    </li>
  );
}
