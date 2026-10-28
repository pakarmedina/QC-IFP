import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { StatusBadge, VerdictBadge } from "@/components/ui/badge";
import { RowActions } from "@/components/inspection/row-actions";
import { formatDate, formatDateTime } from "@/lib/format";
import { requirePageUser } from "@/server/auth/guard";
import { listInspections } from "@/server/services/inspection-service";
import { filterQueryString, parseListParams } from "@/lib/inspection-filters";
import { ListReportButton } from "@/components/inspection/list-report-button";

export const metadata = { title: "Inspeksi" };
export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

const selectClass = "block min-h-11 w-full min-w-0 max-w-full rounded-lg border border-slate-300 bg-white px-3 text-base";

export default async function InspectionsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePageUser();
  const params = parseListParams(await searchParams);
  const { items, total, page, pages } = await listInspections(user, params);

  const pageHref = (p: number) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.status) qs.set("status", params.status);
    if (params.verdict) qs.set("verdict", params.verdict);
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
    if (params.month) qs.set("month", params.month);
    if (params.sort !== "newest") qs.set("sort", params.sort);
    qs.set("page", String(p));
    return `/inspections?${qs.toString()}`;
  };
  const filtered = Boolean(params.q || params.status || params.verdict || params.from || params.to || params.month);

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Inspeksi</h1>
          <div className="flex flex-wrap gap-2">
            <ListReportButton query={filterQueryString(params)} disabled={total === 0} />
            <Link
              href="/inspections/new"
              className="inline-flex min-h-11 items-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Inspeksi baru
            </Link>
          </div>
        </div>

        <form method="get" className="mt-6 grid grid-cols-2 gap-3 rounded-xl bg-white p-4 ring-1 ring-slate-200 lg:grid-cols-3 [&>div]:min-w-0">
          <div className="col-span-2 lg:col-span-3">
            <label htmlFor="q" className="mb-1 block text-sm font-medium text-slate-700">
              Cari nomor seri, nomor laporan, atau inspektur
            </label>
            <input id="q" name="q" defaultValue={params.q} className={selectClass} />
          </div>
          <div>
            <label htmlFor="status" className="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <select id="status" name="status" defaultValue={params.status ?? ""} className={selectClass}>
              <option value="">Semua</option>
              <option value="DRAFT">Draft</option>
              <option value="FINAL">Final</option>
            </select>
          </div>
          <div>
            <label htmlFor="verdict" className="mb-1 block text-sm font-medium text-slate-700">Hasil</label>
            <select id="verdict" name="verdict" defaultValue={params.verdict ?? ""} className={selectClass}>
              <option value="">Semua</option>
              <option value="PASS">Lulus</option>
              <option value="FAIL">Gagal</option>
            </select>
          </div>
          <div>
            <label htmlFor="sort" className="mb-1 block text-sm font-medium text-slate-700">Urutkan</label>
            <select id="sort" name="sort" defaultValue={params.sort} className={selectClass}>
              <option value="newest">Tanggal terbaru</option>
              <option value="oldest">Tanggal terlama</option>
              <option value="serial">Nomor seri A-Z</option>
            </select>
          </div>
          <div>
            <label htmlFor="month" className="mb-1 block text-sm font-medium text-slate-700">Bulan</label>
            <input id="month" name="month" type="month" defaultValue={params.month} className={selectClass} />
          </div>
          <div>
            <label htmlFor="from" className="mb-1 block text-sm font-medium text-slate-700">Dari tanggal</label>
            <input id="from" name="from" type="date" defaultValue={params.from} className={selectClass} />
          </div>
          <div>
            <label htmlFor="to" className="mb-1 block text-sm font-medium text-slate-700">Sampai tanggal</label>
            <input id="to" name="to" type="date" defaultValue={params.to} className={selectClass} />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="min-h-11 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700">
              Terapkan
            </button>
            {filtered && (
              <Link href="/inspections" className="inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold ring-1 ring-slate-300 hover:bg-slate-100">
                Reset
              </Link>
            )}
          </div>
        </form>

        <p className="mt-4 text-sm text-slate-600" aria-live="polite">
          {total} inspeksi{filtered ? " cocok dengan filter" : ""}
        </p>

        {items.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
            {filtered ? "Tidak ada inspeksi yang cocok. Ubah atau reset filter." : "Belum ada inspeksi. Mulai dengan tombol Inspeksi baru."}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-200 rounded-xl bg-white ring-1 ring-slate-200">
            {items.map((i) => (
              <li key={i.id}>
                <Link href={`/inspections/${i.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-slate-50">
                  <span>
                    <span className="block font-semibold">{i.number}</span>
                    <span className="block text-sm text-slate-600">
                      SN {i.serialNumber} · {i.site} · {formatDate(i.inspectedAt)}
                    </span>
                    <span className="block text-sm text-slate-600">Inspektur: {i.inspector.name}</span>
                    {i.revisionCount > 0 && i.revisedAt && (
                      <span className="block text-sm text-amber-900">
                        Pernah diperbarui {i.revisionCount} kali, terakhir {formatDateTime(i.revisedAt)}
                      </span>
                    )}
                  </span>
                  <span className="flex gap-2">
                    <StatusBadge status={i.status} />
                    {i.status === "FINAL" && <VerdictBadge verdict={i.verdict} />}
                  </span>
                </Link>
                <RowActions
                  id={i.id}
                  number={i.number}
                  isFinal={i.status === "FINAL"}
                  canDelete={user.role === "ADMIN" || i.status === "DRAFT"}
                />
              </li>
            ))}
          </ul>
        )}

        {pages > 1 && (
          <nav aria-label="Halaman" className="mt-4 flex items-center justify-between gap-3">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className="inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold ring-1 ring-slate-300 hover:bg-slate-100">
                Sebelumnya
              </Link>
            ) : (
              <span />
            )}
            <span className="text-sm text-slate-600">
              Halaman {page} dari {pages}
            </span>
            {page < pages ? (
              <Link href={pageHref(page + 1)} className="inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold ring-1 ring-slate-300 hover:bg-slate-100">
                Berikutnya
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </main>
    </>
  );
}
