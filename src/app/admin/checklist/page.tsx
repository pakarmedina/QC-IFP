import { AppHeader } from "@/components/layout/app-header";
import { ChecklistManager } from "@/components/admin/checklist-manager";
import { requirePageUser } from "@/server/auth/guard";
import { listChecklistForAdmin } from "@/server/services/checklist-service";

export const metadata = { title: "Checklist" };
export const dynamic = "force-dynamic";

export default async function AdminChecklistPage() {
  const admin = await requirePageUser(["ADMIN"]);
  const categories = await listChecklistForAdmin();
  return (
    <>
      <AppHeader user={admin} />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">Checklist pemeriksaan</h1>
        <p className="mt-1 text-sm text-slate-600">
          Kelola item pemeriksaan dan tandai item mana yang wajib melampirkan foto. Perubahan tidak mengubah laporan
          inspeksi yang sudah ada, karena teks item disalin saat inspeksi disimpan.
        </p>
        <ChecklistManager
          categories={categories.map((c) => ({
            id: c.id,
            code: c.code,
            name: c.name,
            items: c.items.map((i) => ({
              id: i.id,
              code: i.code,
              label: i.label,
              standard: i.standard,
              requiresPhoto: i.requiresPhoto,
              isActive: i.isActive,
              usedCount: i._count.results,
            })),
          }))}
        />
      </main>
    </>
  );
}
