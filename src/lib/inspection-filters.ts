import type { ListParams } from "@/server/services/inspection-service";

type SP = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const isMonth = (s: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

/** Membaca filter daftar inspeksi dari query string (dipakai halaman daftar dan unduh laporan). */
export function parseListParams(sp: SP): ListParams {
  const status = first(sp.status);
  const verdict = first(sp.verdict);
  const sort = first(sp.sort);
  const from = first(sp.from);
  const to = first(sp.to);
  const month = first(sp.month);
  return {
    q: first(sp.q).trim().slice(0, 60) || undefined,
    status: status === "DRAFT" || status === "FINAL" ? status : undefined,
    verdict: verdict === "PASS" || verdict === "FAIL" ? verdict : undefined,
    from: isDate(from) ? from : undefined,
    to: isDate(to) ? to : undefined,
    month: isMonth(month) ? month : undefined,
    sort: sort === "oldest" || sort === "serial" ? sort : "newest",
    page: Math.max(1, parseInt(first(sp.page), 10) || 1),
  };
}

/** Query string filter (tanpa halaman) untuk diteruskan ke API unduh laporan. */
export function filterQueryString(p: ListParams) {
  const qs = new URLSearchParams();
  if (p.q) qs.set("q", p.q);
  if (p.status) qs.set("status", p.status);
  if (p.verdict) qs.set("verdict", p.verdict);
  if (p.from) qs.set("from", p.from);
  if (p.to) qs.set("to", p.to);
  if (p.month) qs.set("month", p.month);
  if (p.sort !== "newest") qs.set("sort", p.sort);
  return qs.toString();
}
