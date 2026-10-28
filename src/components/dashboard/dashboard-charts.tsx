type MonthStat = { key: string; label: string; pass: number; fail: number };
type Totals = { pass: number; fail: number; drafts: number };

const TRACK_PX = 128;

/** Grafik batang sederhana tanpa pustaka tambahan: inspeksi final per bulan dan komposisi hasil. */
export function DashboardCharts({ monthly, totals }: { monthly: MonthStat[]; totals: Totals }) {
  const max = Math.max(1, ...monthly.map((m) => m.pass + m.fail));
  const all = totals.pass + totals.fail + totals.drafts;
  const monthlyTotal = monthly.reduce((a, m) => a + m.pass + m.fail, 0);

  const parts = [
    { label: "Lulus", value: totals.pass, bar: "bg-green-600", dot: "bg-green-600" },
    { label: "Gagal", value: totals.fail, bar: "bg-red-600", dot: "bg-red-600" },
    { label: "Draft", value: totals.drafts, bar: "bg-amber-400", dot: "bg-amber-400" },
  ];

  return (
    <div className="mt-8 grid gap-6 md:grid-cols-2">
      <section aria-labelledby="chart-monthly" className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <h2 id="chart-monthly" className="text-lg font-bold">
          Inspeksi final per bulan
        </h2>
        {monthlyTotal === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
            Belum ada inspeksi final dalam {monthly.length} bulan terakhir.
          </p>
        ) : (
          <>
            <div
              role="img"
              aria-label={`Inspeksi final per bulan: ${monthly.map((m) => `${m.label} lulus ${m.pass}, gagal ${m.fail}`).join("; ")}`}
              className="mt-4 flex items-end gap-2"
            >
              {monthly.map((m) => {
                const total = m.pass + m.fail;
                return (
                  <div key={m.key} className="flex min-w-0 flex-1 flex-col items-center">
                    <span className="text-xs font-semibold text-slate-700">{total || ""}</span>
                    <div className="flex w-full max-w-10 flex-col justify-end" style={{ height: TRACK_PX }}>
                      {m.fail > 0 && <div className="w-full rounded-t bg-red-600" style={{ height: `${(m.fail / max) * TRACK_PX}px` }} />}
                      {m.pass > 0 && (
                        <div
                          className={`w-full bg-green-600 ${m.fail === 0 ? "rounded-t" : ""}`}
                          style={{ height: `${(m.pass / max) * TRACK_PX}px` }}
                        />
                      )}
                    </div>
                    <span className="mt-1 text-xs text-slate-600">{m.label}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-green-600" aria-hidden="true" /> Lulus
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-red-600" aria-hidden="true" /> Gagal
              </span>
            </p>
          </>
        )}
      </section>

      <section aria-labelledby="chart-share" className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <h2 id="chart-share" className="text-lg font-bold">
          Komposisi inspeksi
        </h2>
        {all === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">Belum ada inspeksi.</p>
        ) : (
          <>
            <div
              role="img"
              aria-label={parts.map((p) => `${p.label} ${p.value}`).join(", ")}
              className="mt-4 flex h-6 w-full overflow-hidden rounded-full bg-slate-200"
            >
              {parts.map((p) =>
                p.value > 0 ? <div key={p.label} className={p.bar} style={{ width: `${(p.value / all) * 100}%` }} /> : null,
              )}
            </div>
            <ul className="mt-4 space-y-2">
              {parts.map((p) => (
                <li key={p.label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="inline-flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-sm ${p.dot}`} aria-hidden="true" />
                    {p.label}
                  </span>
                  <span className="font-semibold">
                    {p.value} <span className="font-normal text-slate-600">({Math.round((p.value / all) * 100)}%)</span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
