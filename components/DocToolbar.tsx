import Link from "next/link";
import PrintButton from "./PrintButton";

export default function DocToolbar({ backHref, children }: { backHref: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
      <Link href={backHref} className="btn-secondary">
        ← Back
      </Link>
      <PrintButton />
      {children}
    </div>
  );
}
