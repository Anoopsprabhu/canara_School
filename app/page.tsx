import Link from "next/link";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/roles";
import { db } from "@/lib/db";
import { members } from "@/lib/schema";
import { getMembershipFee } from "@/lib/settings";
import { STATUS_BADGES, STATUS_LABELS, formatDate, formatMemberNo, formatRupees, todayISO } from "@/lib/format";

export default async function Dashboard() {
  const user = await requireUser();
  const today = todayISO();
  const monthStart = today.slice(0, 8) + "01";

  const approver = can(user.role, "member:approve");
  const [[stats], recent, fee, [{ pending }]] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        collected: sql<number>`coalesce(sum(${members.amount}), 0)::int`,
        thisMonth: sql<number>`count(*) filter (where ${members.receiptDate} >= ${monthStart})::int`,
        today: sql<number>`count(*) filter (where ${members.receiptDate} = ${today})::int`,
      })
      .from(members)
      .where(eq(members.status, "active")),
    db.select().from(members).orderBy(desc(members.createdAt)).limit(8),
    getMembershipFee(),
    // The super admin sees the whole queue; everyone else, their own entries still waiting.
    db
      .select({ pending: count() })
      .from(members)
      .where(approver ? eq(members.status, "pending") : and(eq(members.status, "pending"), eq(members.createdBy, user.id))),
  ]);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Namaskara, {user.name || user.username}</h1>
          <p className="page-subtitle">Life membership fee ₹{formatRupees(fee)}/-</p>
        </div>
        {can(user.role, "member:create") && (
          <Link href="/members/new" className="btn-primary">
            New life member
          </Link>
        )}
      </div>

      {pending > 0 && (
        <div className="alert-warn flex flex-wrap items-center justify-between gap-3">
          <span>
            {approver
              ? `${pending} ${pending === 1 ? "entry is" : "entries are"} waiting for your approval.`
              : `${pending} of your ${pending === 1 ? "entry is" : "entries are"} waiting for the super admin's approval.`}
          </span>
          {approver && (
            <Link href="/approvals" className="btn-primary btn-sm">
              Review
            </Link>
          )}
        </div>
      )}

      <form action="/members" className="flex gap-2">
        <input type="hidden" name="exact" value="1" />
        <input
          name="q"
          aria-label="Find a member"
          placeholder="Membership ID, name or mobile"
          className="input h-11 text-[15px]"
          autoFocus
        />
        <button className="btn-primary h-11 px-5">Search</button>
      </form>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Life members" value={String(stats.total)} />
        <Stat label="Fees collected" value={`₹${formatRupees(stats.collected)}`} />
        <Stat label="Joined this month" value={String(stats.thisMonth)} />
        <Stat label="Joined today" value={String(stats.today)} />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Recently added</h2>
          <Link href="/members?status=all" className="link text-sm">
            View all
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="card empty">No members yet.</div>
        ) : (
          <>
            <div className="table-card hidden sm:block">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Mobile</th>
                    <th>Fee</th>
                    <th>Receipt date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((m) => (
                    <tr key={m.id}>
                      <td className="w-20">
                        <Link href={`/members/${m.id}`} className="id-chip">
                          {formatMemberNo(m.membershipNo)}
                        </Link>
                      </td>
                      <td>
                        <Link href={`/members/${m.id}`} className="font-medium whitespace-nowrap text-slate-900 hover:text-brand-700">
                          {m.name}
                        </Link>
                      </td>
                      <td className="text-slate-600">{m.mobile1}</td>
                      <td>₹{formatRupees(m.amount)}</td>
                      <td className="text-slate-600">{formatDate(m.receiptDate)}</td>
                      <td>
                        <span className={STATUS_BADGES[m.status]}>{STATUS_LABELS[m.status]}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="list-card sm:hidden">
              {recent.map((m) => (
                <li key={m.id}>
                  <Link href={`/members/${m.id}`} className="list-row">
                    <span className="id-chip">{formatMemberNo(m.membershipNo)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-900">{m.name}</span>
                      <span className="block text-xs text-slate-500">
                        {m.mobile1} · {formatDate(m.receiptDate)}
                      </span>
                    </span>
                    {m.status !== "active" && <span className={STATUS_BADGES[m.status]}>{STATUS_LABELS[m.status]}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4 sm:p-5">
      <p className="text-[13px] text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900 tabular-nums sm:text-2xl">{value}</p>
    </div>
  );
}
