import { RESULT_LABEL, VERDICT_LABEL, missingPhotoCodes, summarize, type ReportData, type ReportPhotos } from "./report";

const PHOTO_W = 150; // piksel
const PHOTO_H = 112;
const PHOTO_ROW_PT = 88; // tinggi baris (poin) agar muat foto

export async function buildExcel(report: ReportData, photos: ReportPhotos): Promise<Blob> {
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
    { width: 36 },
    { width: 24 },
  ];

  const thin = { style: "thin" as const, color: { argb: "FFCBD5E1" } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };

  // Judul
  ws.mergeCells("A1:E1");
  ws.getCell("A1").value = `LAPORAN INSPEKSI QC - IFP Hisense ${report.model}`;
  ws.getCell("A1").font = { bold: true, size: 14, color: { argb: "FF1E3A8A" } };
  ws.mergeCells("F1:G1");
  ws.getCell("F1").value = report.verdict ? `HASIL: ${VERDICT_LABEL[report.verdict]}` : "";
  ws.getCell("F1").font = { bold: true, size: 14, color: { argb: report.verdict === "PASS" ? "FF15803D" : "FFB91C1C" } };
  ws.getCell("F1").alignment = { horizontal: "right" };

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
    ws.mergeCells(`C${r}:G${r}`);
    ws.getCell(`A${r}`).value = k;
    ws.getCell(`A${r}`).font = { bold: true };
    ws.getCell(`C${r}`).value = v;
    ws.getCell(`C${r}`).alignment = { wrapText: true, vertical: "top" };
  }

  const counts = summarize(report);
  const sumRow = ws.addRow([]).number;
  ws.mergeCells(`A${sumRow}:G${sumRow}`);
  ws.getCell(`A${sumRow}`).value = `Ringkasan: Ya ${counts.YA} | Tidak ${counts.TIDAK} | N/A ${counts.NA}`;
  ws.getCell(`A${sumRow}`).font = { bold: true };

  const missing = missingPhotoCodes(report, photos);
  if (missing.length) {
    const r = ws.addRow([]).number;
    ws.mergeCells(`A${r}:G${r}`);
    ws.getCell(`A${r}`).value = `Peringatan: foto item ${missing.join(", ")} tidak tersedia di perangkat ini.`;
    ws.getCell(`A${r}`).font = { bold: true, color: { argb: "FFB91C1C" } };
  }
  ws.addRow([]);

  // Tabel
  const headerRow = ws.addRow(["No", "Kode", "Item pemeriksaan", "Standar", "Hasil", "Keterangan", "Foto"]);
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
    ws.mergeCells(`A${cr.number}:G${cr.number}`);
    cr.font = { bold: true };
    cr.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };

    for (const it of cat.items) {
      no++;
      const row = ws.addRow([no, it.code, it.label, it.standard ?? "", RESULT_LABEL[it.result], it.note ?? "", ""]);
      row.eachCell({ includeEmpty: true }, (c) => {
        c.border = border;
        c.alignment = { wrapText: true, vertical: "top" };
      });
      const rc = row.getCell(5);
      rc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fills[it.result] } };
      rc.font = { bold: true, color: { argb: it.result === "TIDAK" ? "FFB91C1C" : "FF000000" } };
      rc.alignment = { horizontal: "center", vertical: "top" };

      const p = photos[it.itemId];
      if (p) {
        row.height = PHOTO_ROW_PT;
        const ratio = p.width / p.height;
        let w = PHOTO_W;
        let h = w / ratio;
        if (h > PHOTO_H) {
          h = PHOTO_H;
          w = h * ratio;
        }
        const imageId = wb.addImage({ base64: p.dataUrl, extension: "jpeg" });
        ws.addImage(imageId, { tl: { col: 6.05, row: row.number - 1 + 0.05 }, ext: { width: w, height: h } });
      }
    }
  }

  ws.addRow([]);
  const s1 = ws.addRow([]).number;
  ws.mergeCells(`A${s1}:C${s1}`);
  ws.mergeCells(`D${s1}:G${s1}`);
  ws.getCell(`A${s1}`).value = "Diperiksa oleh (Inspektur)";
  ws.getCell(`D${s1}`).value = "Disetujui oleh (Supervisor/QA)";
  const s2 = ws.addRow([]);
  s2.height = 42;
  const s3 = ws.addRow([]).number;
  ws.mergeCells(`A${s3}:C${s3}`);
  ws.mergeCells(`D${s3}:G${s3}`);
  ws.getCell(`A${s3}`).value = report.inspector;
  ws.getCell(`D${s3}`).value = report.approvedBy ?? "";
  ws.getCell(`A${s3}`).font = { bold: true };
  ws.getCell(`D${s3}`).font = { bold: true };

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer as unknown as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
