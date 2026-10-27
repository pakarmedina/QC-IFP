import { AppHeader } from "@/components/layout/app-header";
import { NewInspectionForm } from "@/components/inspection/new-inspection-form";
import { todayInput } from "@/lib/format";
import { requirePageUser } from "@/server/auth/guard";

export const metadata = { title: "Inspeksi baru" };
export const dynamic = "force-dynamic";

export default async function NewInspectionPage() {
  const user = await requirePageUser();
  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto max-w-xl px-4 py-8">
        <h1 className="text-2xl font-bold">Inspeksi baru</h1>
        <p className="mt-1 text-sm text-slate-600">
          Isi data unit dulu. Nomor laporan dibuat otomatis, lalu Anda lanjut mengisi 58 titik pemeriksaan.
        </p>
        <div className="mt-6 rounded-xl bg-white p-4 ring-1 ring-slate-200 sm:p-6">
          <NewInspectionForm defaultDate={todayInput()} defaultSite="Purwakarta" />
        </div>
      </main>
    </>
  );
}
