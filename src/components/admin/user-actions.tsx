"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type Action = "approve" | "disable" | "enable" | "makeAdmin" | "makeQc";
const LABELS: Record<Action, string> = {
  approve: "Setujui",
  disable: "Nonaktifkan",
  enable: "Aktifkan kembali",
  makeAdmin: "Jadikan Admin",
  makeQc: "Jadikan Tim QC",
};

type Props = { userId: string; status: "PENDING" | "ACTIVE" | "DISABLED"; role: "ADMIN" | "QC"; isSelf: boolean };

export function UserActions({ userId, status, role, isSelf }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actions: Action[] = [];
  if (status === "PENDING") actions.push("approve");
  if (status === "ACTIVE" && !isSelf) actions.push("disable");
  if (status === "DISABLED") actions.push("enable");
  if (status === "ACTIVE") actions.push(role === "QC" ? "makeAdmin" : "makeQc");
  const visible = actions.filter((a) => !(isSelf && (a === "makeQc" || a === "disable")));

  async function run(action: Action) {
    if (action === "disable" && !window.confirm("Nonaktifkan akun ini? Pengguna akan langsung keluar.")) return;
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Gagal memperbarui pengguna.");
        return;
      }
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {visible.map((a) => (
          <Button
            key={a}
            variant={a === "approve" ? "primary" : "secondary"}
            loading={busy === a}
            disabled={busy !== null}
            onClick={() => run(a)}
          >
            {LABELS[a]}
          </Button>
        ))}
      </div>
      {error && (
        <div className="mt-2">
          <Alert kind="error">{error}</Alert>
        </div>
      )}
    </div>
  );
}
