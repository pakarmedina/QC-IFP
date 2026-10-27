import { requireApiUser } from "@/server/auth/guard";
import { handle, json } from "@/server/http";
import { getInspection, toReportData } from "@/server/services/inspection-service";

/** Data laporan untuk PDF/Excel per baris di daftar riwayat. Hanya inspeksi final. */
export function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(req, async () => {
    const { id } = await params;
    const user = await requireApiUser();
    const inspection = await getInspection(id, user);
    return json({ report: toReportData(inspection), status: inspection.status });
  });
}
