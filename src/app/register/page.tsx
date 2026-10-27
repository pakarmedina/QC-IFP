import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = { title: "Daftar" };

export default function RegisterPage() {
  return (
    <AuthCard title="Daftar akun" subtitle="Akun baru perlu disetujui Admin sebelum bisa dipakai.">
      <AuthForm
        endpoint="/api/auth/register"
        submitLabel="Daftar"
        successMessage="Pendaftaran berhasil. Akun Anda menunggu persetujuan Admin."
        fields={[
          { name: "name", label: "Nama lengkap", autoComplete: "name" },
          { name: "username", label: "Username", autoComplete: "username", hint: "Huruf kecil, angka, titik, atau garis bawah." },
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: "Kata sandi", type: "password", autoComplete: "new-password", hint: "Minimal 8 karakter, ada huruf dan angka." },
          { name: "confirmPassword", label: "Ulangi kata sandi", type: "password", autoComplete: "new-password" },
        ]}
      />
      <p className="mt-4 text-sm">
        Sudah punya akun? <Link href="/login" className="font-medium text-brand-700 underline">Masuk</Link>
      </p>
    </AuthCard>
  );
}
