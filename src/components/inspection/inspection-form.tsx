"use client";

import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SerialField } from "@/components/ui/serial-field";
import { Textarea } from "@/components/ui/textarea";
import { compressImage } from "@/lib/photos/compress";
import { deletePhoto, listPhotos, putPhoto, requestPersistentStorage } from "@/lib/photos/photo-store";
import { DuplicateList, type DuplicateInspection } from "./duplicate-list";
import { PhotoField, type PhotoView } from "./photo-field";

type ResultValue = "YA" | "TIDAK" | "NA";
export type FormItem = { id: string; code: string; label: string; standard: string | null; requiresPhoto: boolean };
export type FormCategory = { code: string; name: string; items: FormItem[] };
export type Answers = Record<string, { result: ResultValue | null; note: string }>;
export type FormHeader = {
  serialNumber: string;
  model: string;
  site: string;
  inspectedAt: string;
  physicalNote: string;
  boxNote: string;
  approvedBy: string;
};

const OPTIONS: { value: ResultValue; label: string; selected: string }[] = [
  { value: "YA", label: "Ya", selected: "peer-checked:bg-green-700 peer-checked:text-white peer-checked:ring-green-700" },
  { value: "TIDAK", label: "Tidak", selected: "peer-checked:bg-red-700 peer-checked:text-white peer-checked:ring-red-700" },
  { value: "NA", label: "N/A", selected: "peer-checked:bg-slate-700 peer-checked:text-white peer-checked:ring-slate-700" },
];

type Props = {
  inspectionId: string;
  number: string;
  status: "DRAFT" | "FINAL";
  categories: FormCategory[];
  initialHeader: FormHeader;
  initialAnswers: Answers;
};

export function InspectionForm({ inspectionId, number, status, categories, initialHeader, initialAnswers }: Props) {
  const router = useRouter();
  const [header, setHeader] = useState(initialHeader);
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"save" | "final" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [showMissing, setShowMissing] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateInspection[]>([]);
  const [view, setView] = useState<"all" | "photo">("all");
  const [photos, setPhotos] = useState<Record<string, PhotoView>>({});
  const [photoErrors, setPhotoErrors] = useState<Record<string, string>>({});
  const [photoBusy, setPhotoBusy] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const isFinal = status === "FINAL";
  const photosRef = useRef(photos);
  photosRef.current = photos;

  const allItems = useMemo(() => categories.flatMap((c) => c.items), [categories]);
  const answeredCount = allItems.filter((i) => answers[i.id]?.result).length;
  const percent = allItems.length ? Math.round((answeredCount / allItems.length) * 100) : 0;
  const photoCount = allItems.filter((i) => i.requiresPhoto).length;

  // Muat foto yang sudah tersimpan di browser ini.
  useEffect(() => {
    let cancelled = false;
    listPhotos(inspectionId)
      .then((list) => {
        if (cancelled) return;
        const loaded: Record<string, PhotoView> = {};
        for (const p of list) loaded[p.itemId] = { url: URL.createObjectURL(p.blob), size: p.blob.size };
        setPhotos(loaded);
      })
      .catch((e: unknown) => {
        if (!cancelled) setStorageError(e instanceof Error ? e.message : "Penyimpanan foto tidak tersedia.");
      });
    return () => {
      cancelled = true;
    };
  }, [inspectionId]);

  useEffect(
    () => () => {
      for (const p of Object.values(photosRef.current)) URL.revokeObjectURL(p.url);
    },
    [],
  );

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function setHeaderField(name: keyof FormHeader, value: string) {
    setHeader((h) => ({ ...h, [name]: value }));
    setDirty(true);
  }

  // Stabil (tidak berubah antar render) supaya kartu item yang tidak berubah tidak ikut dirender ulang.
  const setAnswer = useCallback((itemId: string, patch: Partial<Answers[string]>) => {
    setAnswers((a) => ({ ...a, [itemId]: { ...(a[itemId] ?? { result: null, note: "" }), ...patch } }));
    setDirty(true);
  }, []);

  const onPickPhoto = useCallback(async (item: FormItem, file: File) => {
    setPhotoBusy(item.id);
    setPhotoErrors((e) => ({ ...e, [item.id]: "" }));
    try {
      const c = await compressImage(file);
      await putPhoto({ inspectionId, itemId: item.id, blob: c.blob, width: c.width, height: c.height });
      const old = photosRef.current[item.id];
      if (old) URL.revokeObjectURL(old.url);
      const view: PhotoView = { url: URL.createObjectURL(c.blob), size: c.blob.size };
      setPhotos((p) => ({ ...p, [item.id]: view }));
      void requestPersistentStorage();
    } catch (e) {
      setPhotoErrors((errs) => ({
        ...errs,
        [item.id]: e instanceof Error ? e.message : "Foto gagal disimpan.",
      }));
    } finally {
      setPhotoBusy(null);
    }
  }, [inspectionId]);

  const onRemovePhoto = useCallback(async (item: FormItem) => {
    setPhotoBusy(item.id);
    try {
      await deletePhoto(inspectionId, item.id);
      const old = photosRef.current[item.id];
      if (old) URL.revokeObjectURL(old.url);
      setPhotos((p) => {
        const next = { ...p };
        delete next[item.id];
        return next;
      });
    } catch (e) {
      setPhotoErrors((errs) => ({
        ...errs,
        [item.id]: e instanceof Error ? e.message : "Foto gagal dihapus.",
      }));
    } finally {
      setPhotoBusy(null);
    }
  }, [inspectionId]);

  const counts = useMemo(() => {
    let ya = 0;
    let tidak = 0;
    let na = 0;
    for (const i of allItems) {
      const r = answers[i.id]?.result;
      if (r === "YA") ya++;
      else if (r === "TIDAK") tidak++;
      else if (r === "NA") na++;
    }
    return { ya, tidak, na };
  }, [allItems, answers]);

  // Item yang sedang tampil (mengikuti filter "Semua item" / "Wajib foto").
  const shownItems = useMemo(
    () => (view === "photo" ? allItems.filter((i) => i.requiresPhoto) : allItems),
    [allItems, view],
  );

  function setAllYa() {
    const changing = shownItems.filter((i) => answers[i.id]?.result && answers[i.id]?.result !== "YA").length;
    if (changing > 0 && !window.confirm(`${changing} item yang sudah berisi Tidak atau N/A akan diganti menjadi Ya. Lanjutkan?`)) return;
    setAnswers((a) => {
      const next = { ...a };
      for (const i of shownItems) next[i.id] = { result: "YA", note: next[i.id]?.note ?? "" };
      return next;
    });
    setDirty(true);
    setNotice(null);
  }

  function clearAll() {
    const filled = shownItems.filter((i) => answers[i.id]?.result || answers[i.id]?.note).length;
    if (filled > 0 && !window.confirm(`Kosongkan jawaban dan keterangan ${filled} item yang tampil? Belum tersimpan sampai Anda menekan Simpan.`)) return;
    setAnswers((a) => {
      const next = { ...a };
      for (const i of shownItems) delete next[i.id];
      return next;
    });
    setDirty(true);
    setNotice(null);
  }

  /** Mengembalikan true bila draft berhasil tersimpan. */
  async function save(): Promise<boolean> {
    setError(null);
    setFieldErrors({});
    const results = allItems
      .filter((i) => answers[i.id]?.result)
      .map((i) => ({ itemId: i.id, result: answers[i.id].result, note: answers[i.id].note }));
    try {
      const res = await fetch(`/api/inspections/${inspectionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...header, results }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Gagal menyimpan draft.");
        setFieldErrors(data.fields ?? {});
        return false;
      }
      setDirty(false);
      setDuplicates(Array.isArray(data.duplicates) ? data.duplicates : []);
      return true;
    } catch {
      setError("Tidak dapat terhubung ke server. Perubahan Anda belum tersimpan.");
      return false;
    }
  }

  async function onSave() {
    setBusy("save");
    setNotice(null);
    if (await save()) setNotice("Draft tersimpan.");
    setBusy(null);
  }

  /** Memperbarui inspeksi yang sudah final: data harus lengkap, hasil dihitung ulang di server. */
  async function onUpdateFinal() {
    setNotice(null);
    const missing = allItems.filter((i) => !answers[i.id]?.result);
    if (missing.length) {
      setShowMissing(true);
      setError(`Masih ada ${missing.length} item yang belum diisi. Item pertama: ${missing[0].code}.`);
      document.getElementById(`item-${missing[0].code}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const noNote = allItems.filter((i) => answers[i.id]?.result === "TIDAK" && !answers[i.id].note.trim());
    if (noNote.length) {
      setShowMissing(true);
      setError(`Item bernilai Tidak wajib diberi keterangan: ${noNote.map((i) => i.code).join(", ")}.`);
      document.getElementById(`item-${noNote[0].code}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const noPhoto = allItems.filter((i) => i.requiresPhoto && !photos[i.id]);
    const photoWarn = noPhoto.length
      ? ` Foto item ${noPhoto.map((i) => i.code).join(", ")} tidak ada di browser ini (mungkin diambil dari HP lain), jadi PDF dari browser ini tidak memuatnya.`
      : "";
    if (!window.confirm(`Perbarui inspeksi final ini? Hasil LULUS/GAGAL dihitung ulang dan pembaruan tercatat.${photoWarn} Lanjutkan?`)) return;

    setBusy("final");
    if (await save()) {
      router.push(`/inspections/${inspectionId}`);
      router.refresh();
      return;
    }
    setBusy(null);
  }

  async function onFinalize() {
    setNotice(null);
    const missing = allItems.filter((i) => !answers[i.id]?.result);
    if (missing.length) {
      setShowMissing(true);
      setError(`Masih ada ${missing.length} item yang belum diisi. Item pertama: ${missing[0].code}.`);
      document.getElementById(`item-${missing[0].code}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const noNote = allItems.filter((i) => answers[i.id]?.result === "TIDAK" && !answers[i.id].note.trim());
    if (noNote.length) {
      setShowMissing(true);
      setError(`Item bernilai Tidak wajib diberi keterangan: ${noNote.map((i) => i.code).join(", ")}.`);
      document.getElementById(`item-${noNote[0].code}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const noPhoto = allItems.filter((i) => i.requiresPhoto && !photos[i.id]);
    if (noPhoto.length) {
      setShowMissing(true);
      setError(`Item wajib foto belum ada fotonya: ${noPhoto.map((i) => i.code).join(", ")}.`);
      document.getElementById(`item-${noPhoto[0].code}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const confirmText = photoCount
      ? "Setelah difinalkan, inspeksi terkunci dan tidak bisa diubah lagi. Foto hanya ada di browser HP ini, jadi unduh PDF/Excel dari halaman detail. Lanjutkan?"
      : "Setelah difinalkan, inspeksi terkunci dan tidak bisa diubah lagi. Lanjutkan?";
    if (!window.confirm(confirmText)) return;

    setBusy("final");
    if (await save()) {
      try {
        const res = await fetch(`/api/inspections/${inspectionId}/finalize`, { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? "Gagal memfinalkan inspeksi.");
        } else {
          router.push(`/inspections/${inspectionId}`);
          router.refresh();
          return;
        }
      } catch {
        setError("Tidak dapat terhubung ke server.");
      }
    }
    setBusy(null);
  }

  return (
    <div className="pb-60 sm:pb-36">
      <div className="sticky top-0 z-10 -mx-4 border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <p className="shrink-0 text-sm font-semibold">{number}</p>
          <div
            className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Kemajuan pengisian"
          >
            <div className="h-full bg-brand-600" style={{ width: `${percent}%` }} />
          </div>
          <p className="shrink-0 text-sm text-slate-700">
            {answeredCount}/{allItems.length}
          </p>
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-3xl space-y-6">
        {error && <Alert kind="error">{error}</Alert>}
        {notice && <Alert kind="success">{notice}</Alert>}
        {isFinal && (
          <div role="note" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Inspeksi ini sudah final. Perubahan akan menghitung ulang hasil LULUS/GAGAL dan dicatat sebagai pembaruan.
          </div>
        )}
        {photoCount > 0 && (
          <div role="note" className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800">
            Foto disimpan di browser HP ini saja, tidak di server. Setelah finalisasi, unduh PDF/Excel dari halaman detail
            sebagai arsip foto.
          </div>
        )}
        {storageError && photoCount > 0 && <Alert kind="error">{storageError}</Alert>}
        {duplicates.length > 0 && (
          <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-amber-900">
            <p className="text-sm font-semibold">Nomor seri ini juga tercatat di inspeksi lain:</p>
            <DuplicateList items={duplicates} />
          </div>
        )}

        <section aria-labelledby="hdr" className="rounded-xl bg-white p-4 ring-1 ring-slate-200 sm:p-6">
          <h2 id="hdr" className="text-lg font-bold">
            Data unit
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <SerialField
              name="serialNumber"
              label="Nomor seri unit"
              value={header.serialNumber}
              onChange={(v) => setHeaderField("serialNumber", v)}
              error={fieldErrors.serialNumber?.[0]}
            />
            <SerialField
              name="model"
              label="Model"
              scanTitle="Pindai model"
              value={header.model}
              onChange={(v) => setHeaderField("model", v)}
              error={fieldErrors.model?.[0]}
            />
            <Input
              name="site"
              label="Lokasi / Site"
              value={header.site}
              onChange={(e) => setHeaderField("site", e.target.value)}
              error={fieldErrors.site?.[0]}
            />
            <Input
              name="inspectedAt"
              type="date"
              label="Tanggal inspeksi"
              value={header.inspectedAt}
              onChange={(e) => setHeaderField("inspectedAt", e.target.value)}
              error={fieldErrors.inspectedAt?.[0]}
            />
            <Input
              name="approvedBy"
              label="Disetujui oleh (Supervisor/QA)"
              value={header.approvedBy}
              onChange={(e) => setHeaderField("approvedBy", e.target.value)}
              error={fieldErrors.approvedBy?.[0]}
            />
            <Textarea
              name="physicalNote"
              label="Catatan fisik"
              value={header.physicalNote}
              onChange={(e) => setHeaderField("physicalNote", e.target.value)}
              error={fieldErrors.physicalNote?.[0]}
            />
            <Textarea
              name="boxNote"
              label="Catatan dus"
              value={header.boxNote}
              onChange={(e) => setHeaderField("boxNote", e.target.value)}
              error={fieldErrors.boxNote?.[0]}
            />
          </div>
        </section>

        <div role="group" aria-label="Tampilan item" className="flex flex-wrap gap-2">
          {(["all", "photo"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`min-h-11 rounded-lg px-4 text-sm font-semibold ring-1 ${
                view === v ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-800 ring-slate-300"
              }`}
            >
              {v === "all" ? `Semua item (${allItems.length})` : `Wajib foto (${photoCount})`}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Isi cepat" className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={setAllYa}
            disabled={shownItems.length === 0}
            className="min-h-11 rounded-lg bg-white px-4 text-sm font-semibold text-slate-800 ring-1 ring-slate-300 disabled:opacity-60"
          >
            Semua Ya ({shownItems.length})
          </button>
          <button
            type="button"
            onClick={clearAll}
            disabled={shownItems.length === 0}
            className="min-h-11 rounded-lg bg-white px-4 text-sm font-semibold text-red-800 ring-1 ring-slate-300 disabled:opacity-60"
          >
            Kosongkan
          </button>
        </div>
        {view === "photo" && photoCount === 0 && (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
            Belum ada item yang ditandai wajib foto. Admin bisa menandainya di menu Checklist.
          </p>
        )}

        {categories.map((cat) => {
          const shown = view === "photo" ? cat.items.filter((i) => i.requiresPhoto) : cat.items;
          if (shown.length === 0) return null;
          const done = shown.filter((i) => answers[i.id]?.result).length;
          return (
            <section key={cat.code} aria-labelledby={`cat-${cat.code}`}>
              <h2 id={`cat-${cat.code}`} className="flex items-baseline justify-between text-lg font-bold">
                <span>
                  {cat.code}. {cat.name}
                </span>
                <span className="text-sm font-normal text-slate-600">
                  {done}/{shown.length} terisi
                </span>
              </h2>
              <ul className="mt-3 space-y-3">
                {shown.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    answer={answers[item.id]}
                    photo={photos[item.id]}
                    busy={photoBusy === item.id}
                    photoError={photoErrors[item.id] || undefined}
                    showMissing={showMissing}
                    onSetAnswer={setAnswer}
                    onPick={onPickPhoto}
                    onRemove={onRemovePhoto}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="fixed inset-x-0 bottom-20 z-10 border-y border-slate-200 bg-white px-4 py-3 sm:bottom-0 sm:border-b-0">
        <p className="mx-auto mb-2 max-w-3xl text-sm text-slate-700" aria-live="polite">
          Terisi {answeredCount}/{allItems.length} · <span className="font-semibold text-green-800">Ya {counts.ya}</span> ·{" "}
          <span className="font-semibold text-red-800">Tidak {counts.tidak}</span> · <span className="font-semibold">N/A {counts.na}</span>
        </p>
        <div className="mx-auto flex max-w-3xl gap-3">
          {isFinal ? (
            <>
              <Button variant="secondary" className="flex-1" onClick={() => router.push(`/inspections/${inspectionId}`)} disabled={busy !== null}>
                Batal
              </Button>
              <Button className="flex-1" onClick={onUpdateFinal} loading={busy === "final"} disabled={busy !== null}>
                Simpan pembaruan
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" className="flex-1" onClick={onSave} loading={busy === "save"} disabled={busy !== null}>
                Simpan draft
              </Button>
              <Button className="flex-1" onClick={onFinalize} loading={busy === "final"} disabled={busy !== null}>
                Finalisasi
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

type ItemCardProps = {
  item: FormItem;
  answer: Answers[string] | undefined;
  photo: PhotoView | undefined;
  busy: boolean;
  photoError: string | undefined;
  showMissing: boolean;
  onSetAnswer: (itemId: string, patch: Partial<Answers[string]>) => void;
  onPick: (item: FormItem, file: File) => Promise<void>;
  onRemove: (item: FormItem) => Promise<void>;
};

/** Satu item checklist. Dibungkus memo: hanya kartu yang datanya berubah yang dirender ulang. */
const ItemCard = memo(function ItemCard({ item, answer: a, photo, busy, photoError, showMissing, onSetAnswer, onPick, onRemove }: ItemCardProps) {
  const needsResult = showMissing && !a?.result;
  const needsNote = showMissing && a?.result === "TIDAK" && !a.note.trim();
  const needsPhoto = showMissing && item.requiresPhoto && !photo;
  return (
    <li
      id={`item-${item.code}`}
      className={`rounded-xl bg-white p-4 ring-1 ${needsResult || needsNote || needsPhoto ? "ring-2 ring-red-600" : "ring-slate-200"}`}
    >
      <fieldset>
        <legend className="w-full">
          <span className="text-sm font-semibold text-slate-500">{item.code}</span>{" "}
          <span className="font-medium">{item.label}</span>
          {item.requiresPhoto && (
            <span className="ml-2 align-middle">
              <Badge tone="amber">Wajib foto</Badge>
            </span>
          )}
          {item.standard && <span className="mt-0.5 block text-sm text-slate-600">Standar: {item.standard}</span>}
        </legend>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {OPTIONS.map((o) => (
            <label key={o.value} className="block cursor-pointer">
              <input
                type="radio"
                className="peer sr-only"
                name={`result-${item.id}`}
                value={o.value}
                checked={a?.result === o.value}
                onChange={() => onSetAnswer(item.id, { result: o.value })}
              />
              <span
                className={`flex min-h-11 items-center justify-center rounded-lg bg-white text-sm font-semibold text-slate-800 ring-1 ring-slate-300 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-600 ${o.selected}`}
              >
                {o.label}
              </span>
            </label>
          ))}
        </div>
        <div className="mt-3">
          <Input
            name={`note-${item.id}`}
            label="Keterangan"
            value={a?.note ?? ""}
            maxLength={500}
            onChange={(e) => onSetAnswer(item.id, { note: e.target.value })}
            error={needsNote ? "Wajib diisi untuk item bernilai Tidak" : undefined}
          />
        </div>
        {item.requiresPhoto && (
          <PhotoField
            itemCode={item.code}
            photo={photo}
            busy={busy}
            error={photoError}
            missing={needsPhoto}
            onPick={(file) => void onPick(item, file)}
            onRemove={() => void onRemove(item)}
          />
        )}
        {needsResult && <p className="mt-2 text-sm text-red-700">Pilih Ya, Tidak, atau N/A.</p>}
      </fieldset>
    </li>
  );
});
