import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { members, users } from "@/lib/schema";
import { formatDate, formatDateTime, formatRupees, schoolShort } from "@/lib/format";
import MemberStatusActions from "@/components/MemberStatusActions";

const collector = alias(users, "collector");

export default async function ApprovalsPage() {
  await requireUser("member:approve");
  const rows = await db
    .select({ m: members, collectedBy: collector.name })
    .from(members)
    .leftJoin(collector, eq(collector.id, members.createdBy))
    .where(eq(members.status, "pending"))
    .orderBy(asc(members.createdAt));

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Approvals</h1>
        {rows.length > 0 && (
          <span className="text-sm text-slate-500">
            {rows.length} waiting
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="card empty">Nothing waiting for approval.</div>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ m, collectedBy }) => (
            <li key={m.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <Link href={`/members/${m.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                <span className="grid h-16 w-12 shrink-0 place-items-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                  {m.photoKey && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/files/${m.photoKey}`} alt="" className="h-full w-full object-cover" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-900 hover:text-brand-700">{m.name}</span>
                  <span className="block truncate text-xs text-slate-500">
                    S/o {m.fatherName} · {[m.school && schoolShort(m.school), m.yearOfPassing && `${m.yearOfPassing} batch`].filter(Boolean).join(" ")} · {m.mobile1}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    Entered by {collectedBy || "—"} · {formatDateTime(m.createdAt, true)}
                  </span>
                </span>
              </Link>
              <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-3 sm:border-0 sm:pt-0">
                <div className="min-w-0 text-sm sm:text-right">
                  <div className="font-semibold text-slate-900 tabular-nums">₹{formatRupees(m.amount)}</div>
                  <div className="text-xs text-slate-500">
                    {m.paymentMode}
                    {m.paymentRef && ` · ${m.paymentRef}`}
                    {m.paymentMode !== "Cash" && m.paymentDate && ` · ${formatDate(m.paymentDate)}`}
                  </div>
                </div>
                <div className="shrink-0">
                  <MemberStatusActions id={m.id} status={m.status} canApprove canCancel={false} compact />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
