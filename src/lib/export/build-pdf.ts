import { RESULT_LABEL, VERDICT_LABEL, missingPhotoCodes, summarize, type ReportData, type ReportPhotos } from "./report";

const PAGE_W = 210;
const PAGE_H = 297;
const M = 12;
const CW = PAGE_W - 2 * M;
const LINE = 3.6; // tinggi satu baris teks 8 pt (mm)
const PAD = 1.5;

// Lebar kolom tabel (mm), jumlahnya = CW (186).
const COLS = { code: 14, label: 70, standard: 34, result: 14, note: 54 };

export async function buildPdf(report: ReportData, photos: ReportPhotos): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = M;

  const ensure = (h: number) => {
    if (y + h > PAGE_H - M - 6) {
      doc.addPage();
      y = M;
      return true;
    }
    return false;
  };
  const lines = (text: string, width: number, size = 8) => {
    doc.setFontSize(size);
    return doc.splitTextToSize(text || "-", width) as string[];
  };

  // ---- Judul ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 58, 138);
  doc.text("LAPORAN INSPEKSI QUALITY CONTROL", M, y + 5);
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "normal");
  doc.text(`Interactive Flat Panel Hisense ${report.model}`, M, y + 10.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(report.number, PAGE_W - M, y + 5, { align: "right" });
  if (report.verdict) {
    const pass = report.verdict === "PASS";
    doc.setFillColor(pass ? 21 : 185, pass ? 128 : 28, pass ? 61 : 28);
    doc.roundedRect(PAGE_W - M - 30, y + 7, 30, 7, 1.5, 1.5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(VERDICT_LABEL[report.verdict], PAGE_W - M - 15, y + 12, { align: "center" });
  }
  doc.setTextColor(0, 0, 0);
  y += 18;

  // ---- Data unit (dua kolom) ----
  const info: [string, string][] = [
    ["Nomor seri", report.serialNumber],
    ["Tanggal", report.inspectedAt],
    ["Lokasi / Site", report.site],
    ["Inspektur", report.inspector],
  ];
  doc.setFontSize(9);
  info.forEach(([k, v], i) => {
    const x = M + (i % 2) * (CW / 2);
    const rowY = y + Math.floor(i / 2) * 5.5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(90, 90, 90);
    doc.text(k, x, rowY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(doc.splitTextToSize(v || "-", CW / 2 - 34)[0] as string, x + 28, rowY);
  });
  y += 11;

  for (const [k, v] of [
    ["Catatan fisik", report.physicalNote],
    ["Catatan dus", report.boxNote],
  ] as [string, string | null][]) {
    const ls = lines(v ?? "-", CW - 28, 9);
    ensure(ls.length * 4.2 + 1);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(90, 90, 90);
    doc.text(k, M, y);
    doc.setTextColor(0, 0, 0);
    doc.text(ls, M + 28, y);
    y += ls.length * 4.2 + 1;
  }

  const counts = summarize(report);
  const missing = missingPhotoCodes(report, photos);
  y += 1;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Ringkasan: Ya ${counts.YA}  |  Tidak ${counts.TIDAK}  |  N/A ${counts.NA}`, M, y);
  y += 5;
  if (missing.length) {
    doc.setTextColor(185, 28, 28);
    const ls = lines(`Peringatan: foto item ${missing.join(", ")} tidak tersedia di perangkat ini.`, CW, 9);
    doc.text(ls, M, y);
    y += ls.length * 4 + 1;
    doc.setTextColor(0, 0, 0);
  }
  y += 2;

  // ---- Tabel per kategori ----
  const x0 = M;
  const xs = {
    code: x0,
    label: x0 + COLS.code,
    standard: x0 + COLS.code + COLS.label,
    result: x0 + COLS.code + COLS.label + COLS.standard,
    note: x0 + COLS.code + COLS.label + COLS.standard + COLS.result,
  };

  const drawColumnHeader = () => {
    doc.setFillColor(30, 58, 138);
    doc.rect(x0, y, CW, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("Kode", xs.code + PAD, y + 4);
    doc.text("Item pemeriksaan", xs.label + PAD, y + 4);
    doc.text("Standar", xs.standard + PAD, y + 4);
    doc.text("Hasil", xs.result + PAD, y + 4);
    doc.text("Keterangan", xs.note + PAD, y + 4);
    doc.setTextColor(0, 0, 0);
    y += 6;
  };

  for (const cat of report.categories) {
    ensure(6 + 6 + 10);
    doc.setFillColor(226, 232, 240);
    doc.rect(x0, y, CW, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(cat.name, x0 + PAD, y + 4.2);
    y += 6;
    drawColumnHeader();

    for (const it of cat.items) {
      const labelLines = lines(it.label, COLS.label - 2 * PAD);
      const stdLines = lines(it.standard ?? "-", COLS.standard - 2 * PAD);
      const noteLines = lines(it.note ?? "-", COLS.note - 2 * PAD);
      const rowH = Math.max(labelLines.length, stdLines.length, noteLines.length, 1) * LINE + 2 * PAD;
      if (ensure(rowH)) drawColumnHeader();

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.15);
      doc.rect(x0, y, CW, rowH);
      for (const x of [xs.label, xs.standard, xs.result, xs.note]) doc.line(x, y, x, y + rowH);

      const ty = y + PAD + 2.6;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(it.code, xs.code + PAD, ty);
      doc.text(labelLines, xs.label + PAD, ty);
      doc.text(stdLines, xs.standard + PAD, ty);
      doc.text(noteLines, xs.note + PAD, ty);
      doc.setFont("helvetica", "bold");
      if (it.result === "TIDAK") doc.setTextColor(185, 28, 28);
      else if (it.result === "YA") doc.setTextColor(21, 128, 61);
      else doc.setTextColor(71, 85, 105);
      doc.text(RESULT_LABEL[it.result], xs.result + PAD, ty);
      doc.setTextColor(0, 0, 0);
      y += rowH;
    }
    y += 4;
  }

  // ---- Tanda tangan ----
  ensure(38);
  y += 4;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Diperiksa oleh (Inspektur)", M, y);
  doc.text("Disetujui oleh (Supervisor/QA)", M + CW / 2, y);
  y += 22;
  doc.setDrawColor(100, 100, 100);
  doc.line(M, y, M + 60, y);
  doc.line(M + CW / 2, y, M + CW / 2 + 60, y);
  doc.setFont("helvetica", "bold");
  doc.text(report.inspector, M, y + 4.5);
  doc.text(report.approvedBy ?? "", M + CW / 2, y + 4.5);

  // ---- Lampiran foto ----
  const withPhoto = report.categories.flatMap((c) => c.items).filter((i) => photos[i.itemId]);
  if (withPhoto.length) {
    doc.addPage();
    y = M;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 138);
    doc.text("LAMPIRAN FOTO", M, y + 4);
    doc.setTextColor(0, 0, 0);
    y += 10;

    const gap = 4;
    const cellW = (CW - 2 * gap) / 3;
    const imgH = 42;
    const capH = 9;
    const cellH = imgH + capH + 3;
    withPhoto.forEach((it, idx) => {
      const col = idx % 3;
      if (col === 0 && idx > 0) y += cellH;
      if (col === 0) ensure(cellH);
      const x = M + col * (cellW + gap);
      const p = photos[it.itemId];
      const ratio = p.width / p.height;
      let w = cellW;
      let h = w / ratio;
      if (h > imgH) {
        h = imgH;
        w = h * ratio;
      }
      doc.setDrawColor(203, 213, 225);
      doc.rect(x, y, cellW, imgH);
      doc.addImage(p.dataUrl, "JPEG", x + (cellW - w) / 2, y + (imgH - h) / 2, w, h, undefined, "FAST");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text(`${it.code}  ${RESULT_LABEL[it.result]}`, x, y + imgH + 3.5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      const cap = (doc.splitTextToSize(it.label, cellW) as string[]).slice(0, 2);
      doc.text(cap, x, y + imgH + 6.8);
    });
  }

  // ---- Nomor halaman ----
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`${report.number}  |  ${report.serialNumber}`, M, PAGE_H - 6);
    doc.text(`Halaman ${i} dari ${total}`, PAGE_W - M, PAGE_H - 6, { align: "right" });
  }

  return doc.output("blob");
}
