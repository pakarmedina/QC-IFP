import { RESULT_LABEL, VERDICT_LABEL, summarize, type ReportData } from "./report";

/** Excel berisi data saja (tanpa foto); foto hanya dilampirkan di PDF. */
export async function buildExcel(report: ReportData): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "QC IFP";
  wb.created = new Date();
  const ws = wb.addWorksheet("Laporan", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  ws.columns = [
    { width: 6 },
    { width: 9 },
    { width: 46 },
    { width: 24 },
    { width: 10 },
    { width: 40 },
  ];

  const thin = { style: "thin" as const, color: { argb: "FFCBD5E1" } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };

  // Judul
  ws.mergeCells("A1:D1");
  ws.getCell("A1").value = `LAPORAN INSPEKSI QC - IFP Hisense ${report.model}`;
  ws.getCell("A1").font = { bold: true, size: 14, color: { argb: "FF1E3A8A" } };
  ws.mergeCells("E1:F1");
  ws.getCell("E1").value = report.verdict ? `HASIL: ${VERDICT_LABEL[report.verdict]}` : "";
  ws.getCell("E1").font = { bold: true, size: 14, color: { argb: report.verdict === "PASS" ? "FF15803D" : "FFB91C1C" } };
  ws.getCell("E1").alignment = { horizontal: "right" };

  const info: [string, string][] = [
    ["Nomor laporan", report.number],
    ["Nomor seri", report.serialNumber],
    ["Tanggal", report.inspectedAt],
    ["Lokasi / Site", report.site],
    ["Inspektur", report.inspector],
    ["Disetujui oleh", report.approvedBy ?? "-"],
    ["Catatan fisik", report.physicalNote ?? "-"],
    ["Catatan dus", report.boxNote ?? "-"],
  ];
  for (const [k, v] of info) {
    const r = ws.addRow([]).number;
    ws.mergeCells(`A${r}:B${r}`);
    ws.mergeCells(`C${r}:F${r}`);
    ws.getCell(`A${r}`).value = k;
    ws.getCell(`A${r}`).font = { bold: true };
    ws.getCell(`C${r}`).value = v;
    ws.getCell(`C${r}`).alignment = { wrapText: true, vertical: "top" };
  }

  const counts = summarize(report);
  const sumRow = ws.addRow([]).number;
  ws.mergeCells(`A${sumRow}:F${sumRow}`);
  ws.getCell(`A${sumRow}`).value = `Ringkasan: Ya ${counts.YA} | Tidak ${counts.TIDAK} | N/A ${counts.NA}`;
  ws.getCell(`A${sumRow}`).font = { bold: true };

  ws.addRow([]);

  // Tabel
  const headerRow = ws.addRow(["No", "Kode", "Item pemeriksaan", "Standar", "Hasil", "Keterangan"]);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    c.border = border;
    c.alignment = { vertical: "middle", horizontal: "center" };
  });
  ws.views = [{ state: "frozen", ySplit: headerRow.number }];

  const fills = {
    YA: "FFDCFCE7",
    TIDAK: "FFFEE2E2",
    NA: "FFF1F5F9",
  } as const;

  let no = 0;
  for (const cat of report.categories) {
    const cr = ws.addRow([cat.name]);
    ws.mergeCells(`A${cr.number}:F${cr.number}`);
    cr.font = { bold: true };
    cr.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };

    for (const it of cat.items) {
      no++;
      const row = ws.addRow([no, it.code, it.label, it.standard ?? "", RESULT_LABEL[it.result], it.note ?? ""]);
      row.eachCell({ includeEmpty: true }, (c) => {
        c.border = border;
        c.alignment = { wrapText: true, vertical: "top" };
      });
      const rc = row.getCell(5);
      rc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fills[it.result] } };
      rc.font = { bold: true, color: { argb: it.result === "TIDAK" ? "FFB91C1C" : "FF000000" } };
      rc.alignment = { horizontal: "center", vertical: "top" };
    }
  }

  ws.addRow([]);
  const s1 = ws.addRow([]).number;
  ws.mergeCells(`A${s1}:C${s1}`);
  ws.mergeCells(`D${s1}:F${s1}`);
  ws.getCell(`A${s1}`).value = "Diperiksa oleh (Inspektur)";
  ws.getCell(`D${s1}`).value = "Disetujui oleh (Supervisor/QA)";
  const s2 = ws.addRow([]);
  s2.height = 42;
  const s3 = ws.addRow([]).number;
  ws.mergeCells(`A${s3}:C${s3}`);
  ws.mergeCells(`D${s3}:F${s3}`);
  ws.getCell(`A${s3}`).value = report.inspector;
  ws.getCell(`D${s3}`).value = report.approvedBy ?? "";
  ws.getCell(`A${s3}`).font = { bold: true };
  ws.getCell(`D${s3}`).font = { bold: true };

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer as unknown as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
