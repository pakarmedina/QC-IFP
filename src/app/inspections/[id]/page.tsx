import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { DeleteInspectionButton } from "@/components/inspection/delete-inspection-button";
import { ExportButtons } from "@/components/inspection/export-buttons";
import type { ReportData } from "@/lib/export/report";
import { Badge, StatusBadge, VerdictBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { requirePageUser } from "@/server/auth/guard";
import { findInspection, groupResults } from "@/server/services/inspection-service";

export const metadata = { title: "Detail inspeksi" };
export const dynamic = "force-dynamic";

const RESULT_LABEL = { YA: "Ya", TIDAK: "Tidak", NA: "N/A" } as const;
const RESULT_TONE = { YA: "green", TIDAK: "red", NA: "slate" } as const;

export default async function InspectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser();
  const inspection = await findInspection(id, user);
  if (!inspection) notFound();

  const groups = groupResults(inspection.results);
  const canEdit = inspection.status === "DRAFT";
  const canDelete = user.role === "ADMIN" || inspection.status === "DRAFT";
  const report: ReportData = {
    number: inspection.number,
    serialNumber: inspection.serialNumber,
    model: inspection.model,
    site: inspection.site,
    inspectedAt: formatDate(inspection.inspectedAt),
    inspector: inspection.inspector.name,
    approvedBy: inspection.approvedBy,
    physicalNote: inspection.physicalNote,
    boxNote: inspection.boxNote,
    verdict: inspection.verdict,
    categories: groups.map((g) => ({
      name: g.name,
      items: g.results.map((r) => ({
        itemId: r.itemId,
        code: r.itemCode,
        label: r.itemLabel,
        standard: r.standard,
        result: r.result,
        note: r.note,
        requiresPhoto: r.requiresPhoto,
      })),
    })),
  };
  const info: [string, string][] = [
    ["Nomor seri", inspection.serialNumber],
    ["Model", inspection.model],
    ["Lokasi / Site", inspection.site],
    ["Tanggal inspeksi", formatDate(inspection.inspectedAt)],
    ["Inspektur", inspection.inspector.name],
    ["Disetujui oleh", inspection.approvedBy ?? "-"],
    ["Catatan fisik", inspection.physicalNote ?? "-"],
    ["Catatan dus", inspection.boxNote ?? "-"],
  ];

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Link href="/inspections" className="text-sm font-medium text-brand-700 underline">
          Kembali ke daftar
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{inspection.number}</h1>
            <div className="mt-2 flex gap-2">
              <StatusBadge status={inspection.status} />
              {inspection.status === "FINAL" && <VerdictBadge verdict={inspection.verdict} />}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <Link
                href={`/inspections/${inspection.id}/edit`}
                className="inline-flex min-h-11 items-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Lanjutkan mengisi
              </Link>
            )}
            {canDelete && <DeleteInspectionButton id={inspection.id} number={inspection.number} />}
          </div>
        </div>

        <dl className="mt-6 grid gap-x-6 gap-y-3 rounded-xl bg-white p-4 ring-1 ring-slate-200 sm:grid-cols-2 sm:p-6">
          {info.map(([k, v]) => (
            <div key={k}>
              <dt className="text-sm text-slate-600">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>

        {inspection.status === "FINAL" && <ExportButtons inspectionId={inspection.id} report={report} />}

        {groups.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
            Belum ada item yang diisi.
          </p>
        ) : (
          groups.map((g) => (
            <section key={g.name} className="mt-6" aria-label={g.name}>
              <h2 className="text-lg font-bold">{g.name}</h2>
              <ul className="mt-3 divide-y divide-slate-200 rounded-xl bg-white ring-1 ring-slate-200">
                {g.results.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 p-3">
                    <span className="min-w-0 flex-1">
                      <span className="text-sm font-semibold text-slate-500">{r.itemCode}</span> {r.itemLabel}
                      {r.standard && <span className="block text-sm text-slate-600">Standar: {r.standard}</span>}
                      {r.note && <span className="block text-sm text-slate-800">Keterangan: {r.note}</span>}
                    </span>
                    <Badge tone={RESULT_TONE[r.result]}>{RESULT_LABEL[r.result]}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </main>
    </>
  );
}
