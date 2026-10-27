"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { deleteAllPhotos, listPhotos } from "@/lib/photos/photo-store";
import { blobToDataUrl, downloadBlob, fileBase, type ReportData, type ReportPhotos } from "@/lib/export/report";

type Props = { inspectionId: string; report: ReportData };

export function ExportButtons({ inspectionId, report }: Props) {
  const [stored, setStored] = useState<number | null>(null);
  const [busy, setBusy] = useState<"pdf" | "xlsx" | "clear" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const photoItems = report.categories.flatMap((c) => c.items).filter((i) => i.requiresPhoto).length;

  useEffect(() => {
    let cancelled = false;
    listPhotos(inspectionId)
      .then((l) => !cancelled && setStored(l.length))
      .catch(() => !cancelled && setStored(0));
    return () => {
      cancelled = true;
    };
  }, [inspectionId]);

  async function loadPhotos(): Promise<ReportPhotos> {
    const list = await listPhotos(inspectionId).catch(() => []);
    const out: ReportPhotos = {};
    for (const p of list) out[p.itemId] = { dataUrl: await blobToDataUrl(p.blob), width: p.width, height: p.height };
    return out;
  }

  async function run(kind: "pdf" | "xlsx") {
    setBusy(kind);
    setError(null);
    setNotice(null);
    try {
      const photos = await loadPhotos();
      if (kind === "pdf") {
        const { buildPdf } = await import("@/lib/export/build-pdf");
        downloadBlob(await buildPdf(report, photos), `${fileBase(report)}.pdf`);
      } else {
        const { buildExcel } = await import("@/lib/export/build-excel");
        downloadBlob(await buildExcel(report, photos), `${fileBase(report)}.xlsx`);
      }
      setNotice("File diunduh. Periksa folder Download di HP Anda.");
    } catch (e) {
      setError(e instanceof Error ? `Gagal membuat file: ${e.message}` : "Gagal membuat file.");
    } finally {
      setBusy(null);
    }
  }

  async function clearPhotos() {
    if (!window.confirm("Hapus semua foto inspeksi ini dari browser HP? Pastikan PDF/Excel sudah diunduh dan tersimpan. Foto tidak bisa dikembalikan.")) return;
    setBusy("clear");
    setError(null);
    setNotice(null);
    try {
      await deleteAllPhotos(inspectionId);
      setStored(0);
      setNotice("Foto dihapus dari browser ini.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus foto.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="export-title" className="mt-6 rounded-xl bg-white p-4 ring-1 ring-slate-200 sm:p-6">
      <h2 id="export-title" className="text-lg font-bold">
        Unduh laporan
      </h2>
      {stored !== null && photoItems > 0 && (
        <p
          className={`mt-2 text-sm ${stored >= photoItems ? "text-slate-700" : "text-amber-900"}`}
          role={stored < photoItems ? "status" : undefined}
        >
          {stored === 0
            ? "Foto tidak ditemukan di browser ini. Laporan akan dibuat tanpa foto. Buka halaman ini dari HP dan browser yang dipakai saat inspeksi."
            : `Foto tersimpan di browser ini: ${stored} dari ${photoItems} item wajib foto.`}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => run("pdf")} loading={busy === "pdf"} disabled={busy !== null}>
          Unduh PDF
        </Button>
        <Button variant="secondary" onClick={() => run("xlsx")} loading={busy === "xlsx"} disabled={busy !== null}>
          Unduh Excel
        </Button>
        {stored !== null && stored > 0 && (
          <Button variant="secondary" className="text-red-800" onClick={clearPhotos} loading={busy === "clear"} disabled={busy !== null}>
            Hapus foto dari browser
          </Button>
        )}
      </div>
      <div className="mt-3 space-y-2">
        {error && <Alert kind="error">{error}</Alert>}
        {notice && <Alert kind="success">{notice}</Alert>}
      </div>
    </section>
  );
}
