import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { UnitAddForm } from "@/components/admin/unit-add-form";
import { UnitDeleteButton } from "@/components/admin/unit-delete-button";
import { Badge } from "@/components/ui/badge";
import { formatDate, todayInput } from "@/lib/format";
import { requirePageUser } from "@/server/auth/guard";
import { getUnitOverview, type UnitStatus } from "@/server/services/unit-service";

export const metadata = { title: "Unit masuk" };
export const dynamic = "force-dynamic";

const FILTERS: { value: "all" | UnitStatus; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "BELUM", label: "Belum diperiksa" },
  { value: "DRAFT", label: "Draft" },
  { value: "FINAL", label: "Sudah final" },
];
const MAX_ROWS = 300;

export default async function AdminUnitsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const admin = await requirePageUser(["ADMIN"]);
  const sp = await searchParams;
  const filter = FILTERS.some((f) => f.value === sp.status) ? (sp.status as "all" | UnitStatus) : "all";
  const q = (sp.q ?? "").trim().toUpperCase();

  const { rows, unregistered, summary } = await getUnitOverview();
  const filtered = rows.filter((r) => (filter === "all" || r.status === filter) && (!q || r.serialNumber.includes(q)));
  const shown = filtered.slice(0, MAX_ROWS);

  const tiles = [
    { label: "Unit masuk", value: summary.total },
    { label: "Belum diperiksa", value: summary.belum, alert: summary.belum > 0 },
    { label: "Draft", value: summary.draft },
    { label: "Final", value: summary.final },
  ];
  const href = (status: string) => `/admin/units?status=${status}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <AppHeader user={admin} />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">Unit masuk ruang pemeriksaan</h1>
        <p className="mt-1 text-sm text-slate-600">
          Data awal untuk memastikan tidak ada unit yang terlewat. Nomor seri dicocokkan dengan riwayat inspeksi tanpa
          membedakan huruf besar/kecil. Unit dianggap sudah diperiksa bila ada inspeksi yang difinalkan.
        </p>

        <div className="mt-6">
          <UnitAddForm defaultDate={todayInput()} />
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.label} className={`rounded-xl p-4 ring-1 ${t.alert ? "bg-amber-50 ring-amber-300" : "bg-white ring-slate-200"}`}>
              <dt className="text-sm text-slate-600">{t.label}</dt>
              <dd className="mt-1 text-3xl font-bold">{t.value}</dd>
            </div>
          ))}
        </dl>
        {summary.final > 0 && (
          <p className="mt-3 text-sm text-slate-600">
            Dari {summary.final} unit final: {summary.pass} lulus, {summary.fail} gagal.
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
          <div role="group" aria-label="Filter status" className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Link
                key={f.value}
                href={href(f.value)}
                aria-current={filter === f.value ? "true" : undefined}
                className={`inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold ring-1 ${
                  filter === f.value ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-800 ring-slate-300"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>
          <form action="/admin/units" className="flex gap-2">
            <input type="hidden" name="status" value={filter} />
            <label htmlFor="q" className="sr-only">
              Cari nomor seri
            </label>
            <input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="Cari nomor seri"
              className="min-h-11 w-44 rounded-lg border border-slate-300 bg-white px-3 text-base"
            />
            <button type="submit" className="min-h-11 rounded-lg bg-white px-4 text-sm font-semibold ring-1 ring-slate-300">
              Cari
            </button>
          </form>
        </div>

        {shown.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
            {rows.length === 0 ? "Belum ada unit yang dicatat." : "Tidak ada unit yang cocok dengan filter ini."}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-200 rounded-xl bg-white ring-1 ring-slate-200">
            {shown.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="font-mono font-semibold">{r.serialNumber}</p>
                  <p className="text-sm text-slate-600">
                    Masuk {formatDate(r.receivedAt)}
                    {r.note ? ` · ${r.note}` : ""}
                  </p>
                  {r.inspectionId && (
                    <p className="text-sm">
                      <Link href={`/inspections/${r.inspectionId}`} className="font-medium text-brand-700 underline">
                        {r.inspectionNumber}
                      </Link>
                      {r.inspectionCount > 1 ? ` (${r.inspectionCount} inspeksi)` : ""}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {r.status === "BELUM" && <Badge tone="amber">Belum diperiksa</Badge>}
                  {r.status === "DRAFT" && <Badge tone="slate">Draft</Badge>}
                  {r.status === "FINAL" && <Badge tone={r.verdict === "FAIL" ? "red" : "green"}>{r.verdict === "FAIL" ? "Final - Gagal" : "Final - Lulus"}</Badge>}
                  <UnitDeleteButton id={r.id} serialNumber={r.serialNumber} />
                </div>
              </li>
            ))}
          </ul>
        )}
        {filtered.length > MAX_ROWS && (
          <p className="mt-2 text-sm text-slate-600">Menampilkan {MAX_ROWS} dari {filtered.length} unit. Gunakan pencarian atau filter.</p>
        )}

        {unregistered.length > 0 && (
          <section aria-labelledby="unreg" className="mt-8">
            <h2 id="unreg" className="text-lg font-bold">
              Diperiksa tetapi tidak tercatat masuk ({unregistered.length})
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Nomor seri ini ada di riwayat inspeksi tetapi belum ada di daftar unit masuk. Bisa jadi salah ketik atau lupa dicatat.
            </p>
            <ul className="mt-3 divide-y divide-slate-200 rounded-xl bg-white ring-1 ring-slate-200">
              {unregistered.slice(0, 100).map((u) => (
                <li key={u.serialNumber} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <span className="font-mono font-semibold">{u.serialNumber}</span>
                  <Link href={`/inspections/${u.id}`} className="text-sm font-medium text-brand-700 underline">
                    {u.number}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
