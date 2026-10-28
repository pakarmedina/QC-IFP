"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);
    setFieldErrors({});
    try {
      const res = await fetch("/api/profile", {
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
      setSaved(true);
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error && <Alert kind="error">{error}</Alert>}
      {saved && <Alert kind="success">Data akun tersimpan.</Alert>}
      <Input name="name" label="Nama" defaultValue={name} autoComplete="name" required error={fieldErrors.name?.[0]} />
      <Input name="email" type="email" label="Email" defaultValue={email} autoComplete="email" required error={fieldErrors.email?.[0]} />
      <Button type="submit" loading={loading} className="w-full sm:w-auto">
        Simpan
      </Button>
    </form>
  );
}
