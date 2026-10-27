import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentUser } from "@/server/auth/session";

export const metadata = { title: "Masuk" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <AuthCard title="Masuk" subtitle="Gunakan akun Tim QC atau Admin.">
      <AuthForm
        endpoint="/api/auth/login"
        submitLabel="Masuk"
        successRedirect="/dashboard"
        fields={[
          { name: "identifier", label: "Username atau email", autoComplete: "username" },
          { name: "password", label: "Kata sandi", type: "password", autoComplete: "current-password" },
        ]}
      />
      <div className="mt-4 flex justify-between text-sm">
        <Link href="/forgot-password" className="font-medium text-brand-700 underline">Lupa kata sandi?</Link>
        <Link href="/register" className="font-medium text-brand-700 underline">Daftar akun</Link>
      </div>
    </AuthCard>
  );
}
