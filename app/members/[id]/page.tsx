import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/roles";
import { getMember } from "@/lib/queries";
import {
  STATUS_BADGES,
  STATUS_LABELS,
  ageFrom,
  amountInWords,
  formatDate,
  formatDateTime,
  formatMemberNo,
  formatPlace,
  formatRupees,
} from "@/lib/format";
import MemberStatusActions from "@/components/MemberStatusActions";

export default async function MemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const user = await requireUser();
  const row = await getMember(Number((await params).id));
  if (!row) notFound();
  const m = row.member;
  const created = (await searchParams).created === "1";
  const no = formatMemberNo(m.membershipNo);
  const age = ageFrom(m.dob, m.applicationDate);
  const pending = m.status === "pending";
  const approved = m.status === "active";
  const canApprove = can(user.role, "member:approve");

  const canCancel = can(user.role, "member:cancel");

  return (
    <div className="space-y-6">
      {created && pending && (
        <div className="alert-warn">
          <b>Submitted for approval.</b> The membership ID and receipt are issued once the super admin approves it.
        </div>
      )}

      {created && approved && (
        <div className="alert-success">
          Saved. Membership ID <b className="tabular-nums">{no}</b> issued to {m.name}.
        </div>
      )}

      {pending && canApprove && (
        <div className="alert-warn flex flex-wrap items-center justify-between gap-3">
          <span>
            Waiting for approval · entered by {row.createdByName || "—"} on {formatDateTime(m.createdAt)}
          </span>
          <MemberStatusActions id={m.id} status={m.status} canApprove canCancel={false} />
        </div>
      )}

      <div className="page-header items-start">
        <div className="flex min-w-0 items-center gap-4">
          {!pending && (
            <div className="grid h-14 min-w-14 shrink-0 place-items-center rounded-xl bg-brand-900 px-2 text-lg font-semibold text-white tabular-nums">
              {no}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="page-title">{m.name}</h1>
              <span className={STATUS_BADGES[m.status]}>{STATUS_LABELS[m.status]}</span>
            </div>
            <p className="page-subtitle">
              {pending ? "Membership ID is issued on approval" : `Life member since ${formatDate(m.receiptDate)}`}
            </p>
            {m.cancelReason && (m.status === "cancelled" || m.status === "rejected") && (
              <p className="mt-1 text-sm text-red-700">Reason: {m.cancelReason}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {can(user.role, "member:edit") && (
            <Link href={`/members/${m.id}/edit`} className="btn-secondary">
              Edit
            </Link>
          )}
          <Link href={`/members/${m.id}/application`} className="btn-secondary">
            Application form
          </Link>
          {!pending && (
            <Link href={`/members/${m.id}/receipt`} className="btn-primary">
              Print receipt
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Applicant details</h2>
          </div>
          <div className="flex flex-col gap-6 p-5 sm:flex-row">
            <div className="grid h-40 w-30 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              {m.photoKey ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/files/${m.photoKey}`} alt={m.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-slate-400">No photo</span>
              )}
            </div>
            <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4">
              <Item label="Son of">{m.fatherName}</Item>
              <Item label="School">{m.school}</Item>
              <Item label="Year of passing">{m.yearOfPassing}</Item>
              <Item label="Date of birth">
                {m.dob ? `${formatDate(m.dob)}${age !== null ? ` (${age} yrs)` : ""}` : ""}
              </Item>
              <Item label="Mobile">{[m.mobile1, m.mobile2].filter(Boolean).join(", ")}</Item>
              <Item label="E-mail">{m.email}</Item>
              <Item label="Application">{[formatDate(m.applicationDate), m.place].filter(Boolean).join(", ")}</Item>
              <Item label="Address" wide>
                <span className="whitespace-pre-line">{m.address}</span>
                <span className="block">{formatPlace(m)}</span>
              </Item>
              <Item label="Address proof">
                {m.proofKey ? (
                  <a href={`/api/files/${m.proofKey}`} target="_blank" rel="noreferrer" className="link">
                    View file
                  </a>
                ) : (
                  ""
                )}
              </Item>
            </dl>
          </div>
        </section>

        <div className="space-y-6">
          <section className="card">
            <div className="card-header">
              <h2 className="card-title">Fee receipt</h2>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <div className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">₹{formatRupees(m.amount)}/-</div>
                <p className="text-xs text-slate-500">Rupees {amountInWords(m.amount)}</p>
              </div>
              <dl className="space-y-3">
                <Item label="Receipt">
                  {pending ? "Issued on approval" : `No. ${no}`} · {formatDate(m.receiptDate)}
                </Item>
                <Item label="Paid by">
                  {m.paymentMode}
                  {m.paymentRef && ` · ${m.paymentRef}`}
                  {m.paymentDate && m.paymentMode !== "Cash" && ` · ${formatDate(m.paymentDate)}`}
                </Item>
                {m.bankName && <Item label="Bank">{m.bankName}</Item>}
                <Item label="Collected by">{row.createdByName}</Item>
                {m.approvedAt && (
                  <Item label="Approved by">{`${row.approvedByName || "—"} · ${formatDateTime(m.approvedAt)}`}</Item>
                )}
                {m.remarks && <Item label="Remarks">{m.remarks}</Item>}
              </dl>
            </div>
          </section>

          <section className="space-y-3 px-1 text-xs text-slate-500">
            <p>
              Entered by {row.createdByName || "—"} on {formatDateTime(m.createdAt, true)}
              {m.updatedAt.getTime() - m.createdAt.getTime() > 1000 && (
                <>
                  <br />
                  Last changed by {row.updatedByName || "—"} on {formatDateTime(m.updatedAt, true)}
                </>
              )}
            </p>
            {!pending && (canApprove || canCancel) && (
              <MemberStatusActions id={m.id} status={m.status} canApprove={canApprove} canCancel={canCancel} compact />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Item({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? "col-span-2" : "min-w-0 break-words"}>
      <dt className="field-label">{label}</dt>
      <dd className="field-value">{children || <span className="text-slate-300">—</span>}</dd>
    </div>
  );
}
