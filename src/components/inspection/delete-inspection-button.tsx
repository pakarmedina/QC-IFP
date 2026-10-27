"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function DeleteInspectionButton({ id, number }: { id: string; number: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (!window.confirm(`Hapus inspeksi ${number}? Tindakan ini tidak bisa dibatalkan.`)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/inspections/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Gagal menghapus inspeksi.");
        return;
      }
      router.push("/inspections");
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button variant="secondary" loading={loading} onClick={onDelete} className="text-red-800">
        Hapus
      </Button>
      {error && (
        <div className="mt-2">
          <Alert kind="error">{error}</Alert>
        </div>
      )}
    </div>
  );
}
