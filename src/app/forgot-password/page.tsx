import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = { title: "Lupa kata sandi" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Lupa kata sandi" subtitle="Kami kirim tautan reset ke email akun Anda.">
      <AuthForm
        endpoint="/api/auth/forgot-password"
        submitLabel="Kirim tautan reset"
        successMessage="Jika email terdaftar, tautan reset sudah dikirim. Periksa kotak masuk Anda."
        fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]}
      />
      <p className="mt-4 text-sm">
        <Link href="/login" className="font-medium text-brand-700 underline">Kembali ke halaman masuk</Link>
      </p>
    </AuthCard>
  );
}
