import { AppHeader } from "@/components/layout/app-header";
import { AuthForm } from "@/components/auth/auth-form";
import { ProfileForm } from "@/components/profile/profile-form";
import { requirePageUser } from "@/server/auth/guard";

export const metadata = { title: "Akun Saya" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requirePageUser();
  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold">Akun Saya</h1>
        <p className="mt-1 text-sm text-slate-600">
          @{user.username} · {user.role === "ADMIN" ? "Admin" : "Tim QC"}
        </p>

        <section aria-labelledby="data-akun" className="mt-6 rounded-xl bg-white p-4 ring-1 ring-slate-200 sm:p-6">
          <h2 id="data-akun" className="text-lg font-bold">
            Data akun
          </h2>
          <div className="mt-4">
            <ProfileForm name={user.name} email={user.email} />
          </div>
        </section>

        <section aria-labelledby="ganti-sandi" className="mt-6 rounded-xl bg-white p-4 ring-1 ring-slate-200 sm:p-6">
          <h2 id="ganti-sandi" className="text-lg font-bold">
            Ganti kata sandi
          </h2>
          <p className="mt-1 text-sm text-slate-600">Setelah diganti, perangkat lain yang sedang login akan dikeluarkan.</p>
          <div className="mt-4">
            <AuthForm
              endpoint="/api/profile/password"
              submitLabel="Ganti kata sandi"
              successMessage="Kata sandi berhasil diganti."
              fields={[
                { name: "currentPassword", label: "Kata sandi saat ini", type: "password", autoComplete: "current-password" },
                { name: "password", label: "Kata sandi baru", type: "password", autoComplete: "new-password", hint: "Minimal 8 karakter, berisi huruf dan angka." },
                { name: "confirmPassword", label: "Ulangi kata sandi baru", type: "password", autoComplete: "new-password" },
              ]}
            />
          </div>
        </section>
      </main>
    </>
  );
}
