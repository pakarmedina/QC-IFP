"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewInspectionForm({ defaultDate, defaultSite }: { defaultDate: string; defaultSite: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      const res = await fetch("/api/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget).entries())),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
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
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && <Alert kind="error">{error}</Alert>}
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
      <Button type="submit" loading={loading} className="w-full sm:w-auto">
        Mulai inspeksi
      </Button>
    </form>
  );
}
