import { NextRequest } from "next/server";
import { apiUser } from "@/lib/auth";
import { parseFilters, runReport } from "@/lib/reports";
import { STATUS_LABELS, formatDate, formatMemberNo } from "@/lib/format";

function csvCell(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Opens directly in Excel (the BOM keeps ₹ and Kannada names intact).
export async function GET(req: NextRequest) {
  const { error } = await apiUser("reports:view");
  if (error) return error;

  const f = parseFilters(Object.fromEntries(req.nextUrl.searchParams));
  const { rows, total, counted, excluded } = await runReport(f);

  const header = [
    "Membership No", "Receipt Date", "Name", "Son of", "School", "Year of Passing", "Mobile", "Location", "District", "State", "Pincode", "Amount (Rs)", "Payment Mode", "Ref / UTR / Cheque No",
    "Txn Date", "Bank", "Collected By", "Approved By", "Status", "Remarks",
  ];
  const lines = rows.map(({ m, collectedBy, approvedBy }) => [
    m.membershipNo == null ? "" : formatMemberNo(m.membershipNo),
    formatDate(m.receiptDate),
    m.name,
    m.fatherName,
    m.school,
    m.yearOfPassing,
    m.mobile1,
    m.location,
    m.district,
    m.state,
    m.pincode,
    m.amount,
    m.paymentMode,
    m.paymentRef,
    m.paymentMode === "Cash" ? "" : formatDate(m.paymentDate),
    m.bankName,
    collectedBy ?? "",
    approvedBy ?? "",
    STATUS_LABELS[m.status] ?? m.status,
    m.remarks,
  ]);
  lines.push(["", "", "TOTAL", "", "", "", "", "", "", "", "", total, "", "", "", "", "", "", `${counted} entries${excluded ? ` (${excluded} rejected/cancelled not counted)` : ""}`, ""]);

  const csv = "﻿" + [header, ...lines].map((r) => r.map(csvCell).join(",")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="collections_${f.from}_to_${f.to}.csv"`,
    },
  });
}
