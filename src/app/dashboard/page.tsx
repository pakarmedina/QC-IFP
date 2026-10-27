import { LogoutButton } from "@/components/auth/logout-button";
import { requirePageUser } from "@/server/auth/guard";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requirePageUser();
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-slate-600">
            Masuk sebagai {user.name} ({user.role === "ADMIN" ? "Admin" : "Tim QC"})
          </p>
        </div>
        <LogoutButton />
      </header>
      <p className="mt-8 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
        Statistik dan daftar inspeksi akan ditambahkan pada tahap 3-4. Saat ini yang berfungsi adalah autentikasi.
      </p>
    </main>
  );
}
