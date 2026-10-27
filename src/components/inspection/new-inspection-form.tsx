"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DuplicateList, type DuplicateInspection } from "./duplicate-list";

export function NewInspectionForm({ defaultDate, defaultSite }: { defaultDate: string; defaultSite: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [duplicates, setDuplicates] = useState<DuplicateInspection[]>([]);

  async function submit(confirmDuplicate: boolean) {
    if (!formRef.current) return;
    setLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      const res = await fetch("/api/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(new FormData(formRef.current).entries()), confirmDuplicate }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && Array.isArray(data.duplicates)) {
        setDuplicates(data.duplicates);
        return;
      }
      if (!res.ok) {
        setDuplicates([]);
        setError(data.error ?? "Terjadi kesalahan. Coba lagi.");
        setFieldErrors(data.fields ?? {});
        return;
      }
      router.push(`/inspections/${data.id}/edit`);
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        setDuplicates([]);
        submit(false);
      }}
      className="space-y-4"
      noValidate
    >
      {error && <Alert kind="error">{error}</Alert>}
      {duplicates.length > 0 && (
        <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-amber-900">
          <p className="text-sm font-semibold">Nomor seri ini sudah pernah diinspeksi:</p>
          <DuplicateList items={duplicates} />
          <p className="mt-2 text-sm">Lanjutkan hanya bila ini inspeksi ulang yang disengaja, misalnya setelah perbaikan.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={() => submit(true)} loading={loading}>
              Tetap buat inspeksi
            </Button>
            <Button type="button" variant="secondary" disabled={loading} onClick={() => setDuplicates([])}>
              Ubah nomor seri
            </Button>
          </div>
        </div>
      )}
      <Input name="serialNumber" label="Nomor seri unit" required error={fieldErrors.serialNumber?.[0]} />
      <Input name="site" label="Lokasi / Site" defaultValue={defaultSite} required error={fieldErrors.site?.[0]} />
      <Input
        name="inspectedAt"
        type="date"
        label="Tanggal inspeksi"
        defaultValue={defaultDate}
        required
        error={fieldErrors.inspectedAt?.[0]}
      />
      <Button type="submit" loading={loading && duplicates.length === 0} disabled={duplicates.length > 0} className="w-full sm:w-auto">
        Mulai inspeksi
      </Button>
    </form>
  );
}
