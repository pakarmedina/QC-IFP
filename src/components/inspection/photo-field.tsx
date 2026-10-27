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
  "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg bg-white px-4 text-sm font-semibold text-slate-800 ring-1 ring-slate-300 hover:bg-slate-100";

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
      <p className="mb-1 text-sm font-medium text-slate-700">Foto</p>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} onChange={handle} />
      <input ref={galleryRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={handle} />
      {photo ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt={`Foto item ${itemCode}`} className="h-24 w-24 rounded-lg object-cover ring-1 ring-slate-300" />
          <div className="flex flex-col gap-2">
            <p className="text-xs text-slate-600">{formatSize(photo.size)}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btn} disabled={busy} onClick={() => cameraRef.current?.click()}>
                Foto ulang
              </button>
              <button type="button" className={`${btn} text-red-800`} disabled={busy} onClick={onRemove}>
                Hapus
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn} disabled={busy} onClick={() => cameraRef.current?.click()}>
            {busy ? "Memproses..." : "Ambil foto"}
          </button>
          <button type="button" className={btn} disabled={busy} onClick={() => galleryRef.current?.click()}>
            Pilih dari galeri
          </button>
        </div>
      )}
      {busy && photo && <p className="mt-1 text-sm text-slate-600">Memproses...</p>}
      {missing && !photo && <p className="mt-1 text-sm text-red-700">Foto wajib dilampirkan.</p>}
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}
