"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Item = {
  id: string;
  code: string;
  label: string;
  standard: string | null;
  requiresPhoto: boolean;
  isActive: boolean;
  usedCount: number;
};
type Category = { id: string; code: string; name: string; items: Item[] };

type Call = (key: string, method: "POST" | "PATCH" | "DELETE", url: string, body?: unknown) => Promise<boolean>;

export function ChecklistManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const call: Call = async (key, method, url, body) => {
    setBusyKey(key);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const firstField = data.fields ? Object.values<string[]>(data.fields)[0]?.[0] : undefined;
        setError(firstField ?? data.error ?? "Gagal menyimpan perubahan.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Tidak dapat terhubung ke server.");
      return false;
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="mt-6 space-y-8">
      {error && <Alert kind="error">{error}</Alert>}
      {categories.map((cat) => (
        <section key={cat.id} aria-labelledby={`cat-${cat.code}`}>
          <h2 id={`cat-${cat.code}`} className="text-lg font-bold">
            {cat.code}. {cat.name}{" "}
            <span className="text-sm font-normal text-slate-600">
              ({cat.items.filter((i) => i.isActive).length} aktif, {cat.items.filter((i) => i.requiresPhoto && i.isActive).length} wajib foto)
            </span>
          </h2>
          <ul className="mt-3 divide-y divide-slate-200 rounded-xl bg-white ring-1 ring-slate-200">
            {cat.items.map((item, index) => (
              <ItemRow
                key={item.id}
                item={item}
                isFirst={index === 0}
                isLast={index === cat.items.length - 1}
                busyKey={busyKey}
                call={call}
              />
            ))}
          </ul>
          <AddItemForm categoryId={cat.id} busy={busyKey === `add-${cat.id}`} call={call} />
        </section>
      ))}
    </div>
  );
}

function ItemRow({
  item,
  isFirst,
  isLast,
  busyKey,
  call,
}: {
  item: Item;
  isFirst: boolean;
  isLast: boolean;
  busyKey: string | null;
  call: Call;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(item.label);
  const [standard, setStandard] = useState(item.standard ?? "");
  const anyBusy = busyKey !== null;
  const url = `/api/admin/checklist/${item.id}`;

  async function saveEdit() {
    if (await call(`edit-${item.id}`, "PATCH", url, { label, standard })) setEditing(false);
  }

  async function remove() {
    if (!window.confirm(`Hapus item ${item.code} "${item.label}"?`)) return;
    await call(`del-${item.id}`, "DELETE", url);
  }

  return (
    <li className={`p-4 ${item.isActive ? "" : "bg-slate-50"}`}>
      {editing ? (
        <div className="space-y-3">
          <Input name={`label-${item.id}`} label="Nama item" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={200} />
          <Input name={`std-${item.id}`} label="Standar (opsional)" value={standard} onChange={(e) => setStandard(e.target.value)} maxLength={120} />
          <div className="flex gap-2">
            <Button loading={busyKey === `edit-${item.id}`} disabled={anyBusy} onClick={saveEdit}>
              Simpan
            </Button>
            <Button
              variant="secondary"
              disabled={anyBusy}
              onClick={() => {
                setLabel(item.label);
                setStandard(item.standard ?? "");
                setEditing(false);
              }}
            >
              Batal
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p>
            <span className="text-sm font-semibold text-slate-500">{item.code}</span>{" "}
            <span className="font-medium">{item.label}</span>
          </p>
          {item.standard && <p className="text-sm text-slate-600">Standar: {item.standard}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            {item.requiresPhoto && <Badge tone="amber">Wajib foto</Badge>}
            {!item.isActive && <Badge tone="slate">Nonaktif</Badge>}
            {item.usedCount > 0 && <Badge tone="slate">Dipakai di {item.usedCount} hasil</Badge>}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-medium ring-1 ring-slate-300">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={item.requiresPhoto}
                disabled={anyBusy}
                onChange={(e) => call(`photo-${item.id}`, "PATCH", url, { requiresPhoto: e.target.checked })}
              />
              Wajib foto
            </label>
            <Button variant="secondary" disabled={anyBusy || isFirst} onClick={() => call(`up-${item.id}`, "PATCH", url, { move: "up" })} aria-label={`Naikkan ${item.code}`}>
              Naik
            </Button>
            <Button variant="secondary" disabled={anyBusy || isLast} onClick={() => call(`down-${item.id}`, "PATCH", url, { move: "down" })} aria-label={`Turunkan ${item.code}`}>
              Turun
            </Button>
            <Button variant="secondary" disabled={anyBusy} onClick={() => setEditing(true)}>
              Ubah
            </Button>
            <Button
              variant="secondary"
              disabled={anyBusy}
              onClick={() => call(`active-${item.id}`, "PATCH", url, { isActive: !item.isActive })}
            >
              {item.isActive ? "Nonaktifkan" : "Aktifkan"}
            </Button>
            <Button variant="secondary" className="text-red-800" disabled={anyBusy} loading={busyKey === `del-${item.id}`} onClick={remove}>
              Hapus
            </Button>
          </div>
        </>
      )}
    </li>
  );
}

function AddItemForm({ categoryId, busy, call }: { categoryId: string; busy: boolean; call: Call }) {
  const [label, setLabel] = useState("");
  const [standard, setStandard] = useState("");
  const [requiresPhoto, setRequiresPhoto] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await call(`add-${categoryId}`, "POST", "/api/admin/checklist", { categoryId, label, standard, requiresPhoto });
    if (ok) {
      setLabel("");
      setStandard("");
      setRequiresPhoto(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 space-y-3 rounded-xl border border-dashed border-slate-300 bg-white p-4">
      <p className="text-sm font-semibold">Tambah item</p>
      <Input name={`new-label-${categoryId}`} label="Nama item" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={200} />
      <Input name={`new-std-${categoryId}`} label="Standar (opsional)" value={standard} onChange={(e) => setStandard(e.target.value)} maxLength={120} />
      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
        <input type="checkbox" className="h-5 w-5" checked={requiresPhoto} onChange={(e) => setRequiresPhoto(e.target.checked)} />
        Wajib foto
      </label>
      <Button type="submit" loading={busy}>
        Tambah item
      </Button>
    </form>
  );
}
