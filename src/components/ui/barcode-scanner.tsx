"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

// BarcodeDetector belum ada di tipe bawaan TypeScript.
type Detector = { detect(source: CanvasImageSource): Promise<{ rawValue: string }[]> };
type DetectorCtor = new () => Detector;

type Props = {
  onDetect: (value: string) => void;
  onClose: () => void;
  /** true: kamera tetap terbuka setelah barcode terbaca (untuk memindai banyak unit berturut-turut). */
  continuous?: boolean;
  title?: string;
};

export function BarcodeScanner({ onDetect, onClose, continuous = false, title = "Pindai barcode" }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const onDetectRef = useRef(onDetect);
  const onCloseRef = useRef(onClose);
  onDetectRef.current = onDetect;
  onCloseRef.current = onClose;

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const lastSeen = new Map<string, number>();

    async function start() {
      const Ctor = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
      if (!Ctor) {
        setError("Browser ini belum mendukung pemindai barcode. Pakai Chrome terbaru di Android, atau ketik nomor seri manual.");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Kamera tidak tersedia di browser ini.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      } catch {
        setError("Kamera tidak bisa dibuka. Izinkan akses kamera untuk situs ini di pengaturan browser.");
        return;
      }
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play().catch(() => undefined);
      const detector = new Ctor();

      const tick = async () => {
        if (stopped) return;
        try {
          if (video.readyState >= 2) {
            const codes = await detector.detect(video);
            const value = codes[0]?.rawValue?.trim();
            if (value) {
              const now = Date.now();
              if (now - (lastSeen.get(value) ?? 0) > 3000) {
                lastSeen.set(value, now);
                if (typeof navigator.vibrate === "function") navigator.vibrate(80);
                setLast(value);
                setCount((n) => n + 1);
                onDetectRef.current(value);
                if (!continuous) {
                  onCloseRef.current();
                  return;
                }
              }
            }
          }
        } catch {
          /* frame gagal dibaca, coba lagi */
        }
        timer = setTimeout(tick, 250);
      };
      void tick();
    }
    void start();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [continuous]);

  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4">
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 text-white">
        <p className="font-semibold">{title}</p>
        <Button type="button" variant="secondary" onClick={onClose}>
          {continuous ? "Selesai" : "Tutup"}
        </Button>
      </div>
      <div className="mx-auto mt-4 w-full max-w-md flex-1 overflow-hidden">
        {error ? (
          <p role="alert" className="rounded-lg bg-white p-4 text-sm text-red-800">
            {error}
          </p>
        ) : (
          <>
            <video ref={videoRef} playsInline muted className="max-h-[60vh] w-full rounded-lg bg-black object-cover" />
            <p className="mt-3 text-sm text-white">Arahkan kamera ke barcode pada unit. Pegang HP stabil dan pastikan cukup cahaya.</p>
            {last && (
              <p role="status" className="mt-2 rounded-lg bg-white/10 p-3 text-sm text-white">
                Terbaca: <span className="font-mono font-semibold">{last}</span>
                {continuous && <span> ({count} dipindai)</span>}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
