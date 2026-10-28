export type ListReportRow = {
  number: string;
  serialNumber: string;
  model: string;
  site: string;
  inspectedAt: string; // sudah diformat untuk ditampilkan
  inspector: string;
  status: "DRAFT" | "FINAL";
  verdict: "PASS" | "FAIL" | null;
  approvedBy: string | null;
  revisionCount: number;
};

const STATUS_LABEL = { DRAFT: "Draft", FINAL: "Final" } as const;
const VERDICT_LABEL = { PASS: "LULUS", FAIL: "GAGAL" } as const;

/** Excel rekap daftar inspeksi (satu baris per inspeksi) sesuai filter yang sedang aktif. */
export async function buildListExcel(rows: ListReportRow[], filterText: string, truncated: boolean): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "QC IFP";
  wb.created = new Date();
  const ws = wb.addWorksheet("Rekap inspeksi", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  const widths = [6, 22, 22, 12, 22, 14, 20, 9, 9, 22, 11];
  ws.columns = widths.map((width) => ({ width }));
  const lastCol = "K";

  const pass = rows.filter((r) => r.status === "FINAL" && r.verdict === "PASS").length;
  const fail = rows.filter((r) => r.status === "FINAL" && r.verdict === "FAIL").length;
  const draft = rows.filter((r) => r.status === "DRAFT").length;
  const finalCount = pass + fail;
  const rate = finalCount ? `${Math.round((pass / finalCount) * 100)}%` : "-";

  ws.mergeCells(`A1:${lastCol}1`);
  ws.getCell("A1").value = "REKAP INSPEKSI QC - IFP Hisense 75WM61FE";
  ws.getCell("A1").font = { bold: true, size: 14, color: { argb: "FF1E3A8A" } };

  const meta: string[] = [
    `Filter: ${filterText}`,
    `Total ${rows.length} | Lulus ${pass} | Gagal ${fail} | Draft ${draft} | Persentase lulus ${rate}`,
    ...(truncated ? ["Peringatan: data dibatasi 5000 baris pertama. Persempit filter untuk laporan lengkap."] : []),
  ];
  for (const m of meta) {
    const r = ws.addRow([]).number;
    ws.mergeCells(`A${r}:${lastCol}${r}`);
    ws.getCell(`A${r}`).value = m;
  }
  ws.addRow([]);

  const thin = { style: "thin" as const, color: { argb: "FFCBD5E1" } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };

  const head = ws.addRow(["No", "Nomor laporan", "Nomor seri", "Model", "Lokasi", "Tanggal", "Inspektur", "Status", "Hasil", "Disetujui oleh", "Diperbarui"]);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    c.border = border;
    c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  ws.views = [{ state: "frozen", ySplit: head.number }];

  rows.forEach((r, i) => {
    const row = ws.addRow([
      i + 1,
      r.number,
      r.serialNumber,
      r.model,
      r.site,
      r.inspectedAt,
      r.inspector,
      STATUS_LABEL[r.status],
      r.status === "FINAL" && r.verdict ? VERDICT_LABEL[r.verdict] : "-",
      r.approvedBy ?? "",
      r.revisionCount > 0 ? `${r.revisionCount}x` : "",
    ]);
    row.eachCell({ includeEmpty: true }, (c) => {
      c.border = border;
      c.alignment = { vertical: "top", wrapText: true };
    });
    const v = row.getCell(9);
    v.alignment = { horizontal: "center", vertical: "top" };
    if (r.verdict === "FAIL" && r.status === "FINAL") {
      v.font = { bold: true, color: { argb: "FFB91C1C" } };
      v.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
    } else if (r.verdict === "PASS" && r.status === "FINAL") {
      v.font = { bold: true, color: { argb: "FF15803D" } };
      v.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } };
    }
  });

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
