import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = { title: "Atur ulang kata sandi" };

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <AuthCard title="Atur ulang kata sandi">
      <AuthForm
        endpoint="/api/auth/reset-password"
        submitLabel="Simpan kata sandi baru"
        extraBody={{ token }}
        successMessage="Kata sandi berhasil diubah. Silakan masuk dengan kata sandi baru."
        fields={[
          { name: "password", label: "Kata sandi baru", type: "password", autoComplete: "new-password", hint: "Minimal 8 karakter, ada huruf dan angka." },
          { name: "confirmPassword", label: "Ulangi kata sandi baru", type: "password", autoComplete: "new-password" },
        ]}
      />
      <p className="mt-4 text-sm">
        <Link href="/login" className="font-medium text-brand-700 underline">Ke halaman masuk</Link>
      </p>
    </AuthCard>
  );
}
