import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMember } from "@/lib/queries";
import { getActiveSignatures } from "@/lib/settings";
import ReceiptDoc from "@/components/ReceiptDoc";
import DocToolbar from "@/components/DocToolbar";

export default async function ReceiptPrint({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ copies?: string }>;
}) {
  await requireUser();
  const row = await getMember(Number((await params).id));
  if (!row) notFound();
  const m = row.member;
  const single = (await searchParams).copies === "1";

  // No receipt until the super admin has approved the payment.
  if (m.status === "pending") {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <div className="alert-warn">
          This entry is awaiting the super admin&apos;s approval. The receipt can be printed once it is approved and the
          membership ID is issued.
        </div>
        <Link href={`/members/${m.id}`} className="btn-secondary">
          ← Back
        </Link>
      </div>
    );
  }

  return (
    <div>
      <DocToolbar backHref={`/members/${m.id}`}>
        <Link href={`/members/${m.id}/receipt${single ? "" : "?copies=1"}`} className="btn-secondary">
          {single ? "Show member + office copy" : "Single copy only"}
        </Link>
      </DocToolbar>
      <div className="overflow-x-auto">
        <ReceiptDoc
          m={m}
          single={single}
          collectedBy={row.createdByName ?? ""}
          signatures={m.status === "active" ? await getActiveSignatures() : []}
        />
      </div>
    </div>
  );
}
