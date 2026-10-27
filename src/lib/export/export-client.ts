import { listPhotos } from "@/lib/photos/photo-store";
import { blobToDataUrl, downloadBlob, fileBase, type ReportData, type ReportPhotos } from "./report";

/** Mengambil data laporan dari server lalu membuat PDF/Excel di HP (dipakai tombol per baris di daftar). */
export async function exportInspectionById(kind: "pdf" | "xlsx", inspectionId: string) {
  const res = await fetch(`/api/inspections/${inspectionId}/report`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Data laporan tidak dapat diambil.");
  const report = data.report as ReportData;

  if (kind === "pdf") {
    const list = await listPhotos(inspectionId).catch(() => []);
    const photos: ReportPhotos = {};
    for (const p of list) photos[p.itemId] = { dataUrl: await blobToDataUrl(p.blob), width: p.width, height: p.height };
    const { buildPdf } = await import("./build-pdf");
    downloadBlob(await buildPdf(report, photos), `${fileBase(report)}.pdf`);
  } else {
    const { buildExcel } = await import("./build-excel");
    downloadBlob(await buildExcel(report), `${fileBase(report)}.xlsx`);
  }
}
