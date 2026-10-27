export type ResultValue = "YA" | "TIDAK" | "NA";

export type ReportItem = {
  itemId: string;
  code: string;
  label: string;
  standard: string | null;
  result: ResultValue;
  note: string | null;
  requiresPhoto: boolean;
};

export type ReportCategory = { name: string; items: ReportItem[] };

export type ReportData = {
  number: string;
  serialNumber: string;
  model: string;
  site: string;
  inspectedAt: string; // sudah diformat untuk ditampilkan
  inspector: string;
  approvedBy: string | null;
  physicalNote: string | null;
  boxNote: string | null;
  verdict: "PASS" | "FAIL" | null;
  categories: ReportCategory[];
};

/** Foto per item (kunci = itemId), siap dimasukkan ke PDF/Excel. */
export type ReportPhoto = { dataUrl: string; width: number; height: number };
export type ReportPhotos = Record<string, ReportPhoto>;

export const RESULT_LABEL: Record<ResultValue, string> = { YA: "Ya", TIDAK: "Tidak", NA: "N/A" };
export const VERDICT_LABEL = { PASS: "LULUS", FAIL: "GAGAL" } as const;

export function summarize(report: ReportData) {
  const counts = { YA: 0, TIDAK: 0, NA: 0 };
  for (const c of report.categories) for (const i of c.items) counts[i.result]++;
  return counts;
}

/** Kode item wajib foto yang fotonya tidak ada di perangkat ini. */
export function missingPhotoCodes(report: ReportData, photos: ReportPhotos) {
  return report.categories.flatMap((c) => c.items).filter((i) => i.requiresPhoto && !photos[i.itemId]).map((i) => i.code);
}

export function fileBase(report: ReportData) {
  return `${report.number}_${report.serialNumber}`.replace(/[^A-Za-z0-9_-]+/g, "-");
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Foto tidak bisa dibaca."));
    r.readAsDataURL(blob);
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
