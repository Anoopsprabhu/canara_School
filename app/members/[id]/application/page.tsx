import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMember } from "@/lib/queries";
import { getActiveSignatures } from "@/lib/settings";
import ApplicationDoc from "@/components/ApplicationDoc";
import DocToolbar from "@/components/DocToolbar";

export default async function ApplicationPrint({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const row = await getMember(Number((await params).id));
  if (!row) notFound();

  return (
    <div>
      <DocToolbar backHref={`/members/${row.member.id}`} />
      <div className="overflow-x-auto">
        <ApplicationDoc
          m={row.member}
          collectedBy={row.createdByName ?? ""}
          approvedBy={row.approvedByName ?? ""}
          signatures={row.member.status === "active" ? await getActiveSignatures() : []}
        />
      </div>
    </div>
  );
}
