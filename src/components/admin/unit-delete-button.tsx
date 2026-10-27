"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function UnitDeleteButton({ id, serialNumber }: { id: string; serialNumber: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (!window.confirm(`Hapus ${serialNumber} dari daftar unit masuk? Riwayat inspeksinya tidak ikut terhapus.`)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/units/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Gagal menghapus.");
        return;
      }
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button variant="secondary" className="text-red-800" loading={loading} onClick={onDelete}>
        Hapus
      </Button>
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}
