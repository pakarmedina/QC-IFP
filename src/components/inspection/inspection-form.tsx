"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ResultValue = "YA" | "TIDAK" | "NA";
export type FormItem = { id: string; code: string; label: string; standard: string | null };
export type FormCategory = { code: string; name: string; items: FormItem[] };
export type Answers = Record<string, { result: ResultValue | null; note: string }>;
export type FormHeader = {
  serialNumber: string;
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
  categories: FormCategory[];
  initialHeader: FormHeader;
  initialAnswers: Answers;
};

export function InspectionForm({ inspectionId, number, categories, initialHeader, initialAnswers }: Props) {
  const router = useRouter();
  const [header, setHeader] = useState(initialHeader);
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"save" | "final" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [showMissing, setShowMissing] = useState(false);

  const allItems = useMemo(() => categories.flatMap((c) => c.items), [categories]);
  const answeredCount = allItems.filter((i) => answers[i.id]?.result).length;
  const percent = allItems.length ? Math.round((answeredCount / allItems.length) * 100) : 0;

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

  function setAnswer(itemId: string, patch: Partial<Answers[string]>) {
    setAnswers((a) => ({ ...a, [itemId]: { result: null, note: "", ...a[itemId], ...patch } }));
    setDirty(true);
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
    if (!window.confirm("Setelah difinalkan, inspeksi terkunci dan tidak bisa diubah lagi. Lanjutkan?")) return;

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
    <div className="pb-28">
      <div className="sticky top-0 z-10 -mx-4 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
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

        <section aria-labelledby="hdr" className="rounded-xl bg-white p-4 ring-1 ring-slate-200 sm:p-6">
          <h2 id="hdr" className="text-lg font-bold">
            Data unit
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              name="serialNumber"
              label="Nomor seri unit"
              value={header.serialNumber}
              onChange={(e) => setHeaderField("serialNumber", e.target.value)}
              error={fieldErrors.serialNumber?.[0]}
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

        {categories.map((cat) => {
          const done = cat.items.filter((i) => answers[i.id]?.result).length;
          return (
            <section key={cat.code} aria-labelledby={`cat-${cat.code}`}>
              <h2 id={`cat-${cat.code}`} className="flex items-baseline justify-between text-lg font-bold">
                <span>
                  {cat.code}. {cat.name}
                </span>
                <span className="text-sm font-normal text-slate-600">
                  {done}/{cat.items.length} terisi
                </span>
              </h2>
              <ul className="mt-3 space-y-3">
                {cat.items.map((item) => {
                  const a = answers[item.id];
                  const needsResult = showMissing && !a?.result;
                  const needsNote = showMissing && a?.result === "TIDAK" && !a.note.trim();
                  return (
                    <li
                      key={item.id}
                      id={`item-${item.code}`}
                      className={`rounded-xl bg-white p-4 ring-1 ${needsResult || needsNote ? "ring-2 ring-red-600" : "ring-slate-200"}`}
                    >
                      <fieldset>
                        <legend className="w-full">
                          <span className="text-sm font-semibold text-slate-500">{item.code}</span>{" "}
                          <span className="font-medium">{item.label}</span>
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
                                onChange={() => setAnswer(item.id, { result: o.value })}
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
                            onChange={(e) => setAnswer(item.id, { note: e.target.value })}
                            error={needsNote ? "Wajib diisi untuk item bernilai Tidak" : undefined}
                          />
                        </div>
                        {needsResult && <p className="mt-2 text-sm text-red-700">Pilih Ya, Tidak, atau N/A.</p>}
                      </fieldset>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl gap-3">
          <Button variant="secondary" className="flex-1" onClick={onSave} loading={busy === "save"} disabled={busy !== null}>
            Simpan draft
          </Button>
          <Button className="flex-1" onClick={onFinalize} loading={busy === "final"} disabled={busy !== null}>
            Finalisasi
          </Button>
        </div>
      </div>
    </div>
  );
}
