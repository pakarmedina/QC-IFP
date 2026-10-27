"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { BarcodeScanner } from "@/components/ui/barcode-scanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toUpperCase();

export function UnitAddForm({ defaultDate }: { defaultDate: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [list, setList] = useState<string[]>([]);
  const [receivedAt, setReceivedAt] = useState(defaultDate);
  const [note, setNote] = useState("");
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function add(raw: string) {
    // Beberapa nomor seri sekaligus boleh ditempel, dipisah baris atau koma.
    const parts = raw.split(/[\n,;]+/).map(norm).filter((s) => s.length > 0);
    if (!parts.length) return;
    setList((cur) => {
      const merged = [...cur];
      for (const p of parts) if (!merged.includes(p)) merged.push(p);
      return merged;
    });
    setNotice(null);
  }

  function onAddClick() {
    add(draft);
    setDraft("");
    document.getElementById("unitSerial")?.focus();
  }

  async function save() {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serials: list, receivedAt, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const fieldMsg = data.fields ? Object.values(data.fields as Record<string, string[]>).flat()[0] : null;
        setError(fieldMsg ?? data.error ?? "Gagal menyimpan.");
        return;
      }
      const dup: string[] = data.duplicates ?? [];
      setNotice(
        `${data.added} unit disimpan.` + (dup.length ? ` ${dup.length} sudah terdaftar sebelumnya: ${dup.join(", ")}.` : ""),
      );
      setList([]);
      setNote("");
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-labelledby="add-title" className="rounded-xl bg-white p-4 ring-1 ring-slate-200 sm:p-6">
      <h2 id="add-title" className="text-lg font-bold">
        Catat unit masuk
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Opsional. Catat nomor seri unit yang masuk ke ruang pemeriksaan, lalu bandingkan dengan riwayat inspeksi di bawah.
      </p>

      <div className="mt-4 space-y-4">
        {error && <Alert kind="error">{error}</Alert>}
        {notice && <Alert kind="success">{notice}</Alert>}

        <div>
          <Input
            name="unitSerial"
            label="Nomor seri"
            hint="Ketik atau tempel (boleh banyak, pisahkan dengan baris baru atau koma), atau pindai barcode."
            value={draft}
            autoComplete="off"
            autoCapitalize="characters"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAddClick();
              }
            }}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={onAddClick} disabled={!draft.trim()}>
              Tambah ke daftar
            </Button>
            <Button type="button" variant="secondary" onClick={() => setScanning(true)}>
              Pindai barcode (beruntun)
            </Button>
          </div>
        </div>

        {list.length > 0 && (
          <div>
            <p className="text-sm font-semibold">Daftar yang akan disimpan ({list.length})</p>
            <ul className="mt-2 max-h-60 divide-y divide-slate-200 overflow-y-auto rounded-lg ring-1 ring-slate-200">
              {list.map((s) => (
                <li key={s} className="flex items-center justify-between gap-2 px-3 py-1">
                  <span className="font-mono text-sm">{s}</span>
                  <button
                    type="button"
                    onClick={() => setList((cur) => cur.filter((x) => x !== s))}
                    className="min-h-11 px-2 text-sm font-semibold text-red-800"
                    aria-label={`Hapus ${s} dari daftar`}
                  >
                    Hapus
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input name="receivedAt" type="date" label="Tanggal masuk" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} />
          <Input name="unitNote" label="Catatan (opsional)" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
        </div>

        <Button type="button" onClick={save} loading={loading} disabled={list.length === 0}>
          Simpan {list.length > 0 ? `${list.length} unit` : "unit"}
        </Button>
      </div>

      {scanning && (
        <BarcodeScanner
          continuous
          title="Pindai unit masuk"
          onDetect={(v) => add(v)}
          onClose={() => setScanning(false)}
        />
      )}
    </section>
  );
}
