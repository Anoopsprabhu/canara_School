import Link from "next/link";
import { requireUser } from "@/lib/auth";
import ApplicationDoc from "@/components/ApplicationDoc";
import ReceiptDoc from "@/components/ReceiptDoc";
import PrintButton from "@/components/PrintButton";

// Blank application form / receipt, for filling in by hand at events or
// when the portal isn't at hand.
export default async function BlankFormsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  await requireUser();
  const receipt = (await searchParams).type === "receipt";

  return (
    <div>
      <div className="page-header mb-6 print:hidden">
        <h1 className="page-title">Blank forms</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            <Link
              href="/forms"
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${receipt ? "text-slate-600 hover:text-slate-900" : "bg-brand-800 text-white"}`}
            >
              Application form
            </Link>
            <Link
              href="/forms?type=receipt"
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${receipt ? "bg-brand-800 text-white" : "text-slate-600 hover:text-slate-900"}`}
            >
              Receipt
            </Link>
          </div>
          <PrintButton />
        </div>
      </div>
      <div className="overflow-x-auto">{receipt ? <ReceiptDoc m={null} /> : <ApplicationDoc m={null} />}</div>
    </div>
  );
}
