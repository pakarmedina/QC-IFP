"use client";

import { useState } from "react";
import { downloadBlob } from "@/lib/export/report";
import { todayInput } from "@/lib/format";

const FILTER_LABEL: Record<string, string> = {
  q: "Cari",
  status: "Status",
  verdict: "Hasil",
  month: "Bulan",
  from: "Dari",
  to: "Sampai",
  sort: "Urutan",
};

function describeFilter(query: string) {
  const parts = [...new URLSearchParams(query).entries()].map(([k, v]) => `${FILTER_LABEL[k] ?? k}: ${v}`);
  return parts.length ? parts.join(", ") : "semua inspeksi";
}

/** Unduh rekap Excel dari seluruh hasil filter (bukan hanya halaman yang tampil). */
export function ListReportButton({ query, disabled }: { query: string; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/inspections/export${query ? `?${query}` : ""}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Data laporan tidak dapat diambil.");
      const { buildListExcel } = await import("@/lib/export/build-list-excel");
      const blob = await buildListExcel(data.rows, describeFilter(query), Boolean(data.truncated));
      downloadBlob(blob, `Rekap-QC-IFP_${todayInput()}.xlsx`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={busy || disabled}
        className="inline-flex min-h-11 items-center rounded-lg bg-white px-4 text-sm font-semibold text-slate-800 ring-1 ring-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Memproses..." : "Unduh laporan"}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
