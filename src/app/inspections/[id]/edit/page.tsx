import { notFound } from "next/navigation";
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

  // Semua item default "Ya", kecuali item wajib foto yang harus diisi sendiri oleh inspektur.
  const saved = new Map(inspection.results.map((r) => [r.itemId, r]));
  const answers: Answers = {};
  for (const cat of checklist) {
    for (const item of cat.items) {
      const r = saved.get(item.id);
      if (r) answers[item.id] = { result: r.result, note: r.note ?? "" };
      else if (!item.requiresPhoto) answers[item.id] = { result: "YA", note: "" };
    }
  }

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto max-w-5xl px-4">
        <InspectionForm
          inspectionId={inspection.id}
          number={inspection.number}
          status={inspection.status}
          categories={checklist.map((c) => ({
            code: c.code,
            name: c.name,
            items: c.items.map((i) => ({ id: i.id, code: i.code, label: i.label, standard: i.standard, requiresPhoto: i.requiresPhoto })),
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
