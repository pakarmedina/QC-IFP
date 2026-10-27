const MAX_SIDE = 1280;
const JPEG_QUALITY = 0.72;

type Loaded = { source: CanvasImageSource; width: number; height: number; release: () => void };

async function load(file: File): Promise<Loaded> {
  if (typeof createImageBitmap === "function") {
    try {
      // Orientasi EXIF dibaca otomatis oleh browser modern.
      const bmp = await createImageBitmap(file);
      return { source: bmp, width: bmp.width, height: bmp.height, release: () => bmp.close() };
    } catch {
      /* lanjut ke cara lama */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Foto tidak bisa dibaca."));
      el.src = url;
    });
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => {} };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Mengecilkan foto ke sisi terpanjang 1280 px dan menyimpannya sebagai JPEG (didukung PDF dan Excel). */
export async function compressImage(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  if (!file.type.startsWith("image/")) throw new Error("File yang dipilih bukan gambar.");
  const img = await load(file);
  try {
    if (!img.width || !img.height) throw new Error("Ukuran foto tidak valid.");
    const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
    const width = Math.round(img.width * scale);
    const height = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Browser tidak bisa memproses foto.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img.source, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob) throw new Error("Gagal mengompres foto.");
    return { blob, width, height };
  } finally {
    img.release();
  }
}

export function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
