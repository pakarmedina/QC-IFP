"use client";

import Link from "next/link";
import { useState } from "react";
import { exportInspectionById } from "@/lib/export/export-client";
import { DeleteInspectionButton } from "./delete-inspection-button";

type Props = {
  id: string;
  number: string;
  isFinal: boolean;
  canDelete: boolean;
};

const btn =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-3 text-sm font-semibold text-slate-800 ring-1 ring-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60";

/** Aksi per baris di daftar riwayat: Detail, Perbarui/Lanjutkan, PDF, Excel, Hapus. */
export function RowActions({ id, number, isFinal, canDelete }: Props) {
  const [busy, setBusy] = useState<"pdf" | "xlsx" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: "pdf" | "xlsx") {
    setBusy(kind);
    setError(null);
    try {
      await exportInspectionById(kind, id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat file.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="border-t border-slate-100 px-4 pb-4 pt-3">
      <div className="flex flex-wrap gap-2">
        <Link href={`/inspections/${id}`} className={btn} aria-label={`Detail ${number}`}>
          Detail
        </Link>
        <Link href={`/inspections/${id}/edit`} className={btn} aria-label={`${isFinal ? "Perbarui" : "Lanjutkan"} ${number}`}>
          {isFinal ? "Perbarui" : "Lanjutkan"}
        </Link>
        {isFinal && (
          <>
            <button type="button" className={btn} onClick={() => run("pdf")} disabled={busy !== null} aria-label={`PDF ${number}`}>
              {busy === "pdf" ? "Memproses..." : "PDF"}
            </button>
            <button type="button" className={btn} onClick={() => run("xlsx")} disabled={busy !== null} aria-label={`Excel ${number}`}>
              {busy === "xlsx" ? "Memproses..." : "Excel"}
            </button>
          </>
        )}
        {canDelete && <DeleteInspectionButton id={id} number={number} />}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
