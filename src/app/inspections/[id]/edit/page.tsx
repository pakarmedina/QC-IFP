import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { InspectionForm, type Answers } from "@/components/inspection/inspection-form";
import { toDateInput } from "@/lib/format";
import { requirePageUser } from "@/server/auth/guard";
import { findInspection, getChecklist } from "@/server/services/inspection-service";

export const metadata = { title: "Isi inspeksi" };
export const dynamic = "force-dynamic";

export default async function EditInspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser();
  const [inspection, checklist] = await Promise.all([findInspection(id, user), getChecklist()]);
  if (!inspection) notFound();
  if (inspection.status === "FINAL") redirect(`/inspections/${id}`);

  const answers: Answers = {};
  for (const r of inspection.results) answers[r.itemId] = { result: r.result, note: r.note ?? "" };

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto max-w-5xl px-4">
        <InspectionForm
          inspectionId={inspection.id}
          number={inspection.number}
          categories={checklist.map((c) => ({
            code: c.code,
            name: c.name,
            items: c.items.map((i) => ({ id: i.id, code: i.code, label: i.label, standard: i.standard })),
          }))}
          initialHeader={{
            serialNumber: inspection.serialNumber,
            site: inspection.site,
            inspectedAt: toDateInput(inspection.inspectedAt),
            physicalNote: inspection.physicalNote ?? "",
            boxNote: inspection.boxNote ?? "",
            approvedBy: inspection.approvedBy ?? "",
          }}
          initialAnswers={answers}
        />
      </main>
    </>
  );
}
