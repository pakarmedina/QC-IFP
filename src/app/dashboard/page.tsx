import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { StatusBadge, VerdictBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { requirePageUser } from "@/server/auth/guard";
import { db } from "@/server/db";
import { getDashboardStats } from "@/server/services/inspection-service";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requirePageUser();
  const [stats, pendingUsers] = await Promise.all([
    getDashboardStats(user),
    user.role === "ADMIN" ? db.user.count({ where: { status: "PENDING" } }) : Promise.resolve(0),
  ]);
  const finalCount = stats.pass + stats.fail;
  const passRate = finalCount ? Math.round((stats.pass / finalCount) * 100) : null;

  const tiles = [
    { label: "Total inspeksi", value: stats.total },
    { label: "Lulus", value: stats.pass },
    { label: "Gagal", value: stats.fail },
    { label: "Draft", value: stats.drafts },
  ];

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <Link
            href="/inspections/new"
            className="inline-flex min-h-11 items-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Inspeksi baru
          </Link>
        </div>

        {pendingUsers > 0 && (
          <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {pendingUsers} akun menunggu persetujuan.{" "}
            <Link href="/admin/users" className="font-semibold underline">
              Buka halaman Pengguna
            </Link>
          </p>
        )}

        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
              <dt className="text-sm text-slate-600">{t.label}</dt>
              <dd className="mt-1 text-3xl font-bold">{t.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm text-slate-600">
          {passRate === null
            ? "Persentase lulus muncul setelah ada inspeksi yang difinalkan."
            : `Persentase lulus: ${passRate}% dari ${finalCount} inspeksi final.`}
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section aria-labelledby="recent">
            <h2 id="recent" className="text-lg font-bold">
              Inspeksi terbaru
            </h2>
            {stats.recent.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                Belum ada inspeksi. Mulai dengan tombol Inspeksi baru.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-200 rounded-xl bg-white ring-1 ring-slate-200">
                {stats.recent.map((i) => (
                  <li key={i.id}>
                    <Link href={`/inspections/${i.id}`} className="flex flex-wrap items-center justify-between gap-2 p-3 hover:bg-slate-50">
                      <span>
                        <span className="block font-medium">{i.number}</span>
                        <span className="block text-sm text-slate-600">
                          SN {i.serialNumber} · {formatDate(i.inspectedAt)}
                        </span>
                      </span>
                      <span className="flex gap-2">
                        <StatusBadge status={i.status} />
                        {i.status === "FINAL" && <VerdictBadge verdict={i.verdict} />}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="topng">
            <h2 id="topng" className="text-lg font-bold">
              Item yang paling sering Tidak
            </h2>
            {stats.topFails.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                Belum ada item bernilai Tidak pada inspeksi final.
              </p>
            ) : (
              <ol className="mt-3 divide-y divide-slate-200 rounded-xl bg-white ring-1 ring-slate-200">
                {stats.topFails.map((f) => (
                  <li key={f.itemCode} className="flex items-center justify-between gap-3 p-3">
                    <span>
                      <span className="text-sm font-semibold text-slate-500">{f.itemCode}</span> {f.itemLabel}
                    </span>
                    <span className="shrink-0 text-sm font-semibold">{f._count._all}×</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
