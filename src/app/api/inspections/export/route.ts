import { parseListParams } from "@/lib/inspection-filters";
import { formatDate } from "@/lib/format";
import type { ListReportRow } from "@/lib/export/build-list-excel";
import { requireApiUser } from "@/server/auth/guard";
import { handle, json } from "@/server/http";
import { listForReport } from "@/server/services/inspection-service";

/** Data rekap untuk unduh laporan Excel dari halaman daftar; mengikuti filter yang aktif. */
export function GET(req: Request) {
  return handle(req, async () => {
    const user = await requireApiUser();
    const sp = Object.fromEntries(new URL(req.url).searchParams.entries());
    const rows = await listForReport(user, parseListParams(sp));
    const data: ListReportRow[] = rows.map((r) => ({
      number: r.number,
      serialNumber: r.serialNumber,
      model: r.model,
      site: r.site,
      inspectedAt: formatDate(r.inspectedAt),
      inspector: r.inspector.name,
      status: r.status,
      verdict: r.verdict,
      approvedBy: r.approvedBy,
      revisionCount: r.revisionCount,
    }));
    return json({ rows: data, truncated: data.length >= 5000 });
  });
}
