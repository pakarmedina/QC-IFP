"use client";

import { useRef } from "react";
import { formatSize } from "@/lib/photos/compress";

export type PhotoView = { url: string; size: number };

type Props = {
  itemCode: string;
  photo: PhotoView | undefined;
  busy: boolean;
  error?: string;
  missing?: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
};

const btn =
  "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg bg-white px-3 text-sm font-semibold text-slate-800 ring-1 ring-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60";

/** Foto per item dalam satu baris ringkas: label, pratinjau kecil, dan tombol. */
export function PhotoField({ itemCode, photo, busy, error, missing, onPick, onRemove }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // agar foto yang sama bisa dipilih ulang
    if (file) onPick(file);
  }

  return (
    <div className="mt-3">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} onChange={handle} />
      <input ref={galleryRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={handle} />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-slate-700">Foto</span>
        {photo ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt={`Foto item ${itemCode}`} className="h-11 w-11 rounded-lg object-cover ring-1 ring-slate-300" />
            <span className="text-xs text-slate-600">{formatSize(photo.size)}</span>
            <button type="button" className={btn} disabled={busy} onClick={() => cameraRef.current?.click()} aria-label={`Foto ulang item ${itemCode}`}>
              Ulang
            </button>
            <button type="button" className={`${btn} text-red-800`} disabled={busy} onClick={onRemove} aria-label={`Hapus foto item ${itemCode}`}>
              Hapus
            </button>
          </>
        ) : (
          <>
            <button type="button" className={btn} disabled={busy} onClick={() => cameraRef.current?.click()} aria-label={`Ambil foto item ${itemCode}`}>
              Kamera
            </button>
            <button type="button" className={btn} disabled={busy} onClick={() => galleryRef.current?.click()} aria-label={`Pilih foto item ${itemCode} dari galeri`}>
              Galeri
            </button>
          </>
        )}
        {busy && <span className="text-sm text-slate-600">Memproses...</span>}
      </div>
      {missing && !photo && <p className="mt-1 text-sm text-red-700">Foto wajib dilampirkan.</p>}
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}
