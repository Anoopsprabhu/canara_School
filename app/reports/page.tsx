import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listCollectors, parseFilters, runReport } from "@/lib/reports";
import { PAYMENT_MODES, STATUS_BADGES, STATUS_LABELS, formatDate, formatMemberNo, formatRupees } from "@/lib/format";
import PrintButton from "@/components/PrintButton";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser("reports:view");
  const f = parseFilters(await searchParams);
  const [{ rows, total, counted, excluded, byMode, byCollector }, collectors] = await Promise.all([runReport(f), listCollectors()]);
  const qs = new URLSearchParams(f).toString();
  const collectorName = collectors.find((c) => String(c.id) === f.collectedBy);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Collection report</h1>
          <p className="page-subtitle">
            Life membership fees by receipt date, {formatDate(f.from)} to {formatDate(f.to)}
            {f.mode && ` · ${f.mode}`}
            {collectorName && ` · collected by ${collectorName.name || collectorName.username}`}
            {` · ${f.status === "all" ? "all entries" : STATUS_LABELS[f.status]}`}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <PrintButton className="btn-secondary" />
          <a href={`/api/reports/export?${qs}`} className="btn-primary">
            Download Excel
          </a>
        </div>
      </div>

      <form className="card grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6 lg:items-end print:hidden">
        <label className="block">
          <span className="label">From</span>
          <input type="date" name="from" defaultValue={f.from} className="input" />
        </label>
        <label className="block">
          <span className="label">To</span>
          <input type="date" name="to" defaultValue={f.to} className="input" />
        </label>
        <label className="block">
          <span className="label">Payment mode</span>
          <select name="mode" defaultValue={f.mode} className="input">
            <option value="">All modes</option>
            {PAYMENT_MODES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Collected by</span>
          <select name="collectedBy" defaultValue={f.collectedBy} className="input">
            <option value="">Everyone</option>
            {collectors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || c.username}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Status</span>
          <select name="status" defaultValue={f.status} className="input">
            <option value="active">Approved</option>
            <option value="pending">Pending approval</option>
            <option value="cancelled">Cancelled</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
        </label>
        <div className="col-span-2 flex gap-2 sm:col-span-1">
          <button className="btn-primary flex-1">Show</button>
          <Link href="/reports" className="btn-secondary">
            Reset
          </Link>
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <p className="text-[13px] text-slate-500">Total collected</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">₹{formatRupees(total)}</p>
          <p className="text-sm text-slate-500">
            {counted} {counted === 1 ? "entry" : "entries"}
            {excluded > 0 && ` · ${excluded} rejected / cancelled not counted`}
          </p>
        </div>
        <Breakdown title="By payment mode" items={byMode} />
        <Breakdown title="By collected by" items={byCollector} />
      </div>

      <div className="table-card">
        <table className="text-[13px]! whitespace-nowrap [&_td]:px-3! [&_th]:px-3!">
          <thead>
            <tr>
              <th>No.</th>
              <th>Receipt date</th>
              <th>Name</th>
              <th>Mobile</th>
              <th className="text-right!">Amount</th>
              <th>Mode</th>
              <th>Ref / UTR</th>
              <th>Bank</th>
              <th>Collected by</th>
              <th>Approved by</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="empty">
                  No collections for these filters.
                </td>
              </tr>
            )}
            {rows.map(({ m, collectedBy, approvedBy }) => (
              <tr key={m.id}>
                <td>
                  <Link href={`/members/${m.id}`} className="id-chip">
                    {formatMemberNo(m.membershipNo)}
                  </Link>
                </td>
                <td className="whitespace-nowrap">{formatDate(m.receiptDate)}</td>
                <td className="font-medium text-slate-900">{m.name}</td>
                <td className="text-slate-600">{m.mobile1}</td>
                <td className="text-right font-medium">₹{formatRupees(m.amount)}</td>
                <td className="whitespace-nowrap">{m.paymentMode}</td>
                <td className="text-slate-600">{m.paymentRef}</td>
                <td>{m.bankName}</td>
                <td>{collectedBy}</td>
                <td>{approvedBy}</td>
                <td>
                  <span className={STATUS_BADGES[m.status]}>{STATUS_LABELS[m.status]}</span>
                </td>
              </tr>
            ))}
            {rows.length > 0 && (
              <tr className="bg-slate-50 font-semibold text-slate-900">
                <td colSpan={4} className="text-right">
                  Total
                </td>
                <td className="text-right whitespace-nowrap">₹{formatRupees(total)}</td>
                <td colSpan={6} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Breakdown({ title, items }: { title: string; items: { label: string; count: number; amount: number }[] }) {
  return (
    <div className="card p-5">
      <p className="text-[13px] text-slate-500">{title}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">—</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {items.map((i) => (
            <li key={i.label} className="flex justify-between gap-3">
              <span className="text-slate-700">
                {i.label} <span className="text-xs text-slate-400">× {i.count}</span>
              </span>
              <span className="font-medium text-slate-900 tabular-nums">₹{formatRupees(i.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
