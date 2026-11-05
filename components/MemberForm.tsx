"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PhotoUpload, ProofUpload } from "./PhotoUpload";
import { PAYMENT_MODES, SCHOOLS, ageFrom, amountInWords, formatMemberNo, formatRupees, todayISO } from "@/lib/format";

export type MemberFormValues = {
  name: string;
  fatherName: string;
  school: string;
  yearOfPassing: string;
  dob: string;
  address: string;
  pincode: string;
  location: string;
  district: string;
  state: string;
  mobile1: string;
  mobile2: string;
  email: string;
  photoKey: string;
  proofKey: string;
  applicationDate: string;
  place: string;
  paymentMode: string;
  paymentRef: string;
  paymentDate: string;
  bankName: string;
  receiptDate: string;
  remarks: string;
  membershipNo: string;
  amount: string;
};

function emptyMember(): MemberFormValues {
  const today = todayISO();
  return {
    name: "",
    fatherName: "",
    school: "",
    yearOfPassing: "",
    dob: "",
    address: "",
    pincode: "",
    location: "",
    district: "",
    state: "",
    mobile1: "",
    mobile2: "",
    email: "",
    photoKey: "",
    proofKey: "",
    applicationDate: today,
    place: "Mangaluru",
    paymentMode: "G Pay / UPI",
    paymentRef: "",
    paymentDate: today,
    bankName: "",
    receiptDate: today,
    remarks: "",
    membershipNo: "",
    amount: "",
  };
}

type Duplicate = { id: number; membershipNo: number; name: string };
type Lookup = { status: "idle" | "loading" | "found" | "notfound"; places: string[] };

export default function MemberForm({
  memberId,
  initial,
  fee,
  nextNo,
  canSetNumber,
  needsApproval,
  collectedBy,
}: {
  memberId?: number; // set when editing
  initial?: MemberFormValues; // blank form when omitted
  fee: number;
  nextNo?: number;
  canSetNumber: boolean;
  needsApproval?: boolean; // the entry goes to the super admin before it gets a number
  collectedBy: string; // the logged-in user (new entry) or whoever entered it (edit)
}) {
  const router = useRouter();
  const [v, setV] = useState<MemberFormValues>(() => initial ?? emptyMember());
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState<Duplicate | null>(null);
  const [busy, setBusy] = useState(false);
  // An address without a 6-digit pincode can only be one saved as "outside India".
  const [outsideIndia, setOutsideIndia] = useState(() => !!initial && !!initial.state && !/^\d{6}$/.test(initial.pincode));
  const [lookup, setLookup] = useState<Lookup>({ status: "idle", places: [] });
  // "Others" is chosen when a saved school isn't one of the listed ones.
  const [otherSchool, setOtherSchool] = useState(() => !!initial?.school && !(SCHOOLS as readonly string[]).includes(initial.school));
  const lookupFor = useRef("");

  const set = <K extends keyof MemberFormValues>(k: K, val: MemberFormValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const age = ageFrom(v.dob, v.applicationDate);
  const amount = canSetNumber && v.amount ? Number(v.amount) : initial ? Number(initial.amount) : fee;
  const isCash = v.paymentMode === "Cash";

  // 6 digits typed → fill location, district and state from the India Post directory.
  async function changePincode(raw: string) {
    const pin = raw.replace(/\D/g, "").slice(0, 6);
    setV((p) => ({ ...p, pincode: pin }));
    if (pin.length < 6) {
      setLookup({ status: "idle", places: [] });
      return;
    }
    lookupFor.current = pin;
    setLookup({ status: "loading", places: [] });
    const res = await fetch(`/api/pincode?pin=${pin}`).catch(() => null);
    const data = res?.ok ? await res.json() : null;
    if (lookupFor.current !== pin) return; // a newer pincode was typed meanwhile
    if (!data) {
      setLookup({ status: "notfound", places: [] });
      return;
    }
    setLookup({ status: "found", places: data.places });
    setV((p) => ({ ...p, location: data.location, district: data.district, state: data.state }));
  }

  async function submit(confirmDuplicate = false) {
    if (!v.photoKey) {
      setError("Upload the applicant's photograph");
      setDuplicate(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setBusy(true);
    setError("");
    setDuplicate(null);
    const res = await fetch(memberId ? `/api/members/${memberId}` : "/api/members", {
      method: memberId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...v, outsideIndia, action: "update", confirmDuplicate }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not save");
      if (data.duplicate) setDuplicate(data.duplicate);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    router.push(`/members/${data.id}${memberId ? "" : "?created=1"}`);
    router.refresh();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-6"
    >
      {error && (
        <div className={duplicate ? "alert-warn" : "alert-error"}>
          <p>{error}</p>
          {duplicate && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/members/${duplicate.id}`} className="btn-secondary btn-sm">
                Open Membership No. {formatMemberNo(duplicate.membershipNo)}
              </Link>
              <button type="button" onClick={() => submit(true)} disabled={busy} className="btn-primary btn-sm">
                It&apos;s a different person — save anyway
              </button>
            </div>
          )}
        </div>
      )}

      <section className="card">
        <div className="card-header">
          <h2 className="card-title">Applicant details</h2>
        </div>
        <div className="grid gap-6 p-5 lg:grid-cols-[1fr_auto]">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="1. Name of the applicant *" className="sm:col-span-2">
              <input value={v.name} onChange={(e) => set("name", e.target.value)} className="input uppercase" required autoFocus={!memberId} />
            </Field>
            <Field label="2. Son of *" className="sm:col-span-2">
              <input value={v.fatherName} onChange={(e) => set("fatherName", e.target.value)} className="input uppercase" required />
            </Field>
            <Field label="3. School *" className="sm:col-span-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={otherSchool ? "other" : v.school}
                  onChange={(e) => {
                    const other = e.target.value === "other";
                    setOtherSchool(other);
                    set("school", other ? "" : e.target.value);
                  }}
                  className="input"
                  required
                >
                  <option value="" disabled>
                    Select school
                  </option>
                  {SCHOOLS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="other">Others</option>
                </select>
                {otherSchool && (
                  <input
                    value={v.school}
                    onChange={(e) => set("school", e.target.value)}
                    placeholder="Name of the school"
                    aria-label="Name of the school"
                    className="input"
                    required
                    autoFocus
                  />
                )}
              </div>
            </Field>
            <Field label="Year of passing (SSLC) *">
              <input
                value={v.yearOfPassing}
                onChange={(e) => set("yearOfPassing", e.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                placeholder="e.g. 1991"
                pattern="\d{4}"
                title="4-digit year"
                className="input"
                required
              />
            </Field>
            <Field label={`4. Date of birth *${age !== null ? ` · Age ${age}` : ""}`}>
              <input type="date" value={v.dob} max={todayISO()} onChange={(e) => set("dob", e.target.value)} className="input" required />
            </Field>
            <Field label="5. Full postal address * (house / street / area)" className="sm:col-span-2">
              <textarea value={v.address} onChange={(e) => set("address", e.target.value)} rows={2} className="input" required />
            </Field>
            <div className="grid gap-4 rounded-xl border border-brand-100 bg-brand-50/50 p-4 sm:col-span-2 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={outsideIndia}
                  onChange={(e) => {
                    setOutsideIndia(e.target.checked);
                    setLookup({ status: "idle", places: [] });
                  }}
                  className="h-4 w-4 accent-brand-700"
                />
                Lives outside India
              </label>
              <Field label={outsideIndia ? "Postal / ZIP code" : "Pincode *"}>
                {outsideIndia ? (
                  <input value={v.pincode} onChange={(e) => set("pincode", e.target.value.slice(0, 10))} className="input" />
                ) : (
                  <>
                    <input
                      value={v.pincode}
                      onChange={(e) => changePincode(e.target.value)}
                      inputMode="numeric"
                      placeholder="6 digits — fills location & state"
                      pattern="\d{6}"
                      title="6-digit pincode"
                      className="input"
                      required
                    />
                    <span className="mt-1 block text-xs">
                      {lookup.status === "loading" && <span className="text-slate-500">Looking up…</span>}
                      {lookup.status === "found" && <span className="text-emerald-700">✓ Location filled in</span>}
                      {lookup.status === "notfound" && (
                        <span className="text-amber-700">Pincode not in the directory — type the location and state.</span>
                      )}
                    </span>
                  </>
                )}
              </Field>
              <Field label="Location (town / area) *">
                <input
                  value={v.location}
                  onChange={(e) => set("location", e.target.value)}
                  list="pincode-places"
                  className="input"
                  required
                />
                {lookup.places.length > 1 && (
                  <datalist id="pincode-places">
                    {lookup.places.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                )}
              </Field>
              <Field label={outsideIndia ? "City / region" : "District"}>
                <input value={v.district} onChange={(e) => set("district", e.target.value)} className="input" />
              </Field>
              <Field label={outsideIndia ? "Country *" : "State *"}>
                <input value={v.state} onChange={(e) => set("state", e.target.value)} className="input" required />
              </Field>
              {lookup.places.length > 1 && (
                <p className="text-xs text-slate-500 sm:col-span-2">More post offices for this pincode in the location list.</p>
              )}
            </div>
            <Field label="6. Mobile no. 1 *">
              <input
                value={v.mobile1}
                onChange={(e) => set("mobile1", e.target.value)}
                inputMode="tel"
                placeholder="10-digit mobile"
                className="input"
                required
              />
            </Field>
            <Field label="Mobile no. 2 (optional)">
              <input value={v.mobile2} onChange={(e) => set("mobile2", e.target.value)} inputMode="tel" className="input" />
            </Field>
            <Field label="7. E-mail (optional)">
              <input type="email" value={v.email} onChange={(e) => set("email", e.target.value)} className="input" />
            </Field>
            <div className="sm:col-span-2">
              <ProofUpload value={v.proofKey} onChange={(k) => set("proofKey", k)} />
            </div>
          </div>
          <PhotoUpload value={v.photoKey} onChange={(k) => set("photoKey", k)} required />
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <h2 className="card-title">Declaration</h2>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <p className="text-sm text-slate-600 italic sm:col-span-2">
            &ldquo;I hereby express my willingness to become a Life Member of the association and undertake to abide by the
            bye-laws of the association for the time being in force.&rdquo;
          </p>
          <Field label="Date *">
            <input type="date" value={v.applicationDate} onChange={(e) => set("applicationDate", e.target.value)} className="input" required />
          </Field>
          <Field label="Place *">
            <input value={v.place} onChange={(e) => set("place", e.target.value)} className="input" required />
          </Field>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <h2 className="card-title">Fee payment</h2>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="flex flex-wrap items-baseline gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
            <span className="text-2xl font-semibold tracking-tight text-slate-900">₹{formatRupees(amount || 0)}/-</span>
            <span className="text-sm text-slate-600">Rupees {amountInWords(amount || 0)}</span>
          </div>

          <div className="sm:col-span-2">
            <span className="label">Paid by *</span>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => set("paymentMode", m)}
                  className={`cursor-pointer rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                    v.paymentMode === m
                      ? "border-brand-700 bg-brand-700 text-white shadow"
                      : "border-slate-300 bg-white text-slate-700 hover:border-brand-300"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {!isCash && (
            <>
              <Field label={v.paymentMode === "Cheque" ? "Cheque no. *" : "Transaction / UTR no. *"}>
                <input value={v.paymentRef} onChange={(e) => set("paymentRef", e.target.value)} className="input" required />
              </Field>
              <Field label={v.paymentMode === "Cheque" ? "Cheque date *" : "Transaction date *"}>
                <input type="date" value={v.paymentDate} onChange={(e) => set("paymentDate", e.target.value)} className="input" required />
              </Field>
              <Field label={v.paymentMode === "G Pay / UPI" ? "Bank name (optional)" : "Bank name *"}>
                <input
                  value={v.bankName}
                  onChange={(e) => set("bankName", e.target.value)}
                  placeholder="e.g. Canara Bank"
                  className="input"
                  required={v.paymentMode !== "G Pay / UPI"}
                />
              </Field>
            </>
          )}
          <Field label="Receipt date *">
            <input type="date" value={v.receiptDate} onChange={(e) => set("receiptDate", e.target.value)} className="input" required />
          </Field>
          <Field label="Collected by">
            <input value={collectedBy} disabled className="input font-semibold" title="Filled in automatically from the login" />
          </Field>
          <Field label="Remarks" className="sm:col-span-2">
            <input value={v.remarks} onChange={(e) => set("remarks", e.target.value)} placeholder="optional" className="input" />
          </Field>
        </div>
      </section>

      {canSetNumber && (
        <section className="card border-dashed">
          <div className="card-header">
            <h2 className="card-title">Super admin overrides</h2>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Membership no.">
              <input
                value={v.membershipNo}
                onChange={(e) => set("membershipNo", e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                placeholder={nextNo ? `auto: ${formatMemberNo(nextNo)}` : ""}
                className="input"
              />
            </Field>
            <Field label="Amount (₹)">
              <input
                value={v.amount}
                onChange={(e) => set("amount", e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                placeholder={`fee: ${fee}`}
                className="input"
              />
            </Field>
            <p className="text-xs text-slate-500 sm:col-span-2">For old paper forms only — leave blank otherwise.</p>
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button disabled={busy} className="btn-primary px-6">
          {busy ? "Saving…" : memberId ? "Save changes" : needsApproval ? "Submit for approval" : "Save & generate membership ID"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
