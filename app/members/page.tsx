import Link from "next/link";
import { redirect } from "next/navigation";
import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/roles";
import { db } from "@/lib/db";
import { members } from "@/lib/schema";
import { STATUS_BADGES, STATUS_LABELS, formatDate, formatMemberNo, formatRupees, isValidMembershipNo } from "@/lib/format";

const PAGE_SIZE = 50;

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; exact?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = ["pending", "cancelled", "rejected", "all"].includes(sp.status ?? "") ? sp.status! : "active";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const filters: SQL[] = [];
  if (status !== "all") filters.push(eq(members.status, status));
  if (q) {
    const digits = q.replace(/^0+(?=\d)/, "");
    if (/^\d+$/.test(q)) {
      // A number is a membership ID — or part of a mobile number. Long numbers
      // (a full mobile) can't be an ID and would overflow the integer column.
      const asId = Number(digits);
      const isId = isValidMembershipNo(asId);
      if (sp.exact === "1" && isId) {
        const [hit] = await db.select({ id: members.id }).from(members).where(eq(members.membershipNo, asId));
        if (hit) redirect(`/members/${hit.id}`);
      }
      const ors: SQL[] = isId ? [eq(members.membershipNo, asId)] : [];
      if (q.length >= 4) ors.push(ilike(members.mobile1, `%${q}%`), ilike(members.mobile2, `%${q}%`), ilike(members.paymentRef, `%${q}%`));
      filters.push(or(...ors)!);
    } else {
      const like = `%${q}%`;
      filters.push(
        or(
          ilike(members.name, like),
          ilike(members.fatherName, like),
          ilike(members.email, like),
          ilike(members.address, like),
          ilike(members.location, like),
          ilike(members.paymentRef, like)
        )!
      );
    }
  }
  const where = filters.length ? and(...filters) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(members)
      .where(where)
      .orderBy(sql`${members.membershipNo} desc nulls first`, desc(members.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(members).where(where),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) => `?${new URLSearchParams({ ...(q && { q }), ...(status !== "active" && { status }), page: String(p) })}`;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Members</h1>
        {can(user.role, "member:create") && (
          <Link href="/members/new" className="btn-primary">
            New life member
          </Link>
        )}
      </div>

      <form className="card grid gap-3 p-4 sm:flex sm:items-end">
        <label className="block sm:flex-1">
          <span className="label">Search</span>
          <input name="q" defaultValue={q} placeholder="Membership ID, name, mobile or place" className="input" autoFocus />
        </label>
        <label className="block sm:w-48">
          <span className="label">Status</span>
          <select name="status" defaultValue={status} className="input">
            <option value="active">Approved</option>
            <option value="pending">Pending approval</option>
            <option value="cancelled">Cancelled</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </label>
        <div className="flex gap-2">
          <button className="btn-primary flex-1 sm:flex-none">Search</button>
          {(q || status !== "active") && (
            <Link href="/members" className="btn-secondary">
              Clear
            </Link>
          )}
        </div>
      </form>

      <p className="text-sm text-slate-500">
        {total} member{total === 1 ? "" : "s"}
        {q && (
          <>
            {" "}
            matching <span className="font-medium text-slate-900">&ldquo;{q}&rdquo;</span>
          </>
        )}
      </p>

      {rows.length === 0 ? (
        <div className="card empty">No members found.</div>
      ) : (
        <>
          <div className="table-card hidden md:block">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Location</th>
                  <th>Passed</th>
                  <th>Fee</th>
                  <th>Receipt date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id}>
                    <td className="w-20">
                      <Link href={`/members/${m.id}`} className="id-chip">
                        {formatMemberNo(m.membershipNo)}
                      </Link>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Link href={`/members/${m.id}`} className="font-medium whitespace-nowrap text-slate-900 hover:text-brand-700">
                          {m.name}
                        </Link>
                        {m.status !== "active" && <span className={STATUS_BADGES[m.status]}>{STATUS_LABELS[m.status]}</span>}
                      </div>
                      <div className="text-xs whitespace-nowrap text-slate-500">S/o {m.fatherName}</div>
                    </td>
                    <td className="text-slate-600">{m.mobile1}</td>
                    <td className="text-slate-600">{m.location}</td>
                    <td className="text-slate-600">{m.yearOfPassing}</td>
                    <td className="whitespace-nowrap">
                      ₹{formatRupees(m.amount)}
                      <div className="text-xs text-slate-500">{m.paymentMode}</div>
                    </td>
                    <td className="whitespace-nowrap text-slate-600">{formatDate(m.receiptDate)}</td>
                    <td>
                      <div className="flex justify-end gap-1.5 whitespace-nowrap">
                        <Link href={`/members/${m.id}/application`} className="btn-secondary btn-sm" title="Print application form">
                          Form
                        </Link>
                        {m.status !== "pending" && (
                          <Link href={`/members/${m.id}/receipt`} className="btn-secondary btn-sm" title="Print receipt">
                            Receipt
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="list-card md:hidden">
            {rows.map((m) => (
              <li key={m.id}>
                <Link href={`/members/${m.id}`} className="list-row">
                  <span className="id-chip">{formatMemberNo(m.membershipNo)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-900">{m.name}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {[m.mobile1, m.location, m.yearOfPassing && `${m.yearOfPassing} batch`].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {m.status !== "active" ? (
                    <span className={STATUS_BADGES[m.status]}>{STATUS_LABELS[m.status]}</span>
                  ) : (
                    <span aria-hidden className="text-slate-300">›</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          {page > 1 && (
            <Link href={qs(page - 1)} className="btn-secondary btn-sm">
              ← Previous
            </Link>
          )}
          <span className="text-slate-500">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link href={qs(page + 1)} className="btn-secondary btn-sm">
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
