"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type AuthField = {
  name: string;
  label: string;
  type?: "text" | "email" | "password";
  autoComplete?: string;
  hint?: string;
};

type Props = {
  endpoint: string;
  fields: AuthField[];
  submitLabel: string;
  extraBody?: Record<string, string>;
  successRedirect?: string; // pindah halaman bila berhasil
  successMessage?: string; // atau tampilkan pesan
};

export function AuthForm({ endpoint, fields, submitLabel, extraBody, successRedirect, successMessage }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});
    const body = { ...Object.fromEntries(new FormData(e.currentTarget).entries()), ...extraBody };
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Terjadi kesalahan. Coba lagi.");
        setFieldErrors(data.fields ?? {});
        return;
      }
      if (successRedirect) {
        router.push(successRedirect);
        router.refresh();
      } else {
        setDone(true);
      }
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setLoading(false);
    }
  }

  if (done && successMessage) return <Alert kind="success">{successMessage}</Alert>;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error && <Alert kind="error">{error}</Alert>}
      {fields.map((f) => (
        <Input
          key={f.name}
          name={f.name}
          label={f.label}
          type={f.type ?? "text"}
          autoComplete={f.autoComplete}
          hint={f.hint}
          error={fieldErrors[f.name]?.[0]}
          required
        />
      ))}
      <Button type="submit" loading={loading} className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}
