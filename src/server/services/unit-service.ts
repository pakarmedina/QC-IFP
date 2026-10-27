import { db } from "../db";
import { HttpError } from "../http";
import type { CurrentUser } from "../auth/session";
import type { AddUnitsInput } from "@/lib/validators/unit";

export type UnitStatus = "BELUM" | "DRAFT" | "FINAL";

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toUpperCase();

/** Tanggal YYYY-MM-DD dari form dianggap tanggal WIB. */
const toDbDate = (s: string) => new Date(`${s}T00:00:00+07:00`);

function audit(userId: string, action: string, entityId: string) {
  return db.auditLog.create({ data: { userId, action, entity: "IncomingUnit", entityId } });
}

export async function addUnits(user: CurrentUser, input: AddUnitsInput) {
  const serials = [...new Set(input.serials)];
  const existing = await db.incomingUnit.findMany({
    where: { serialNumber: { in: serials } },
    select: { serialNumber: true },
  });
  const known = new Set(existing.map((e) => e.serialNumber));
  const fresh = serials.filter((s) => !known.has(s));
  if (fresh.length) {
    await db.incomingUnit.createMany({
      data: fresh.map((serialNumber) => ({
        serialNumber,
        receivedAt: toDbDate(input.receivedAt),
        note: input.note,
        createdById: user.id,
      })),
      skipDuplicates: true,
    });
    await audit(user.id, `unit.add:${fresh.length}`, fresh[0]);
  }
  return {
    added: fresh.length,
    duplicates: serials.filter((s) => known.has(s)),
    repeatedInInput: input.serials.length - serials.length,
  };
}

export async function deleteUnit(user: CurrentUser, id: string) {
  const unit = await db.incomingUnit.findUnique({ where: { id }, select: { id: true, serialNumber: true } });
  if (!unit) throw new HttpError(404, "Unit tidak ditemukan.");
  await db.incomingUnit.delete({ where: { id } });
  await audit(user.id, "unit.delete", unit.serialNumber);
}

/**
 * Membandingkan unit masuk dengan riwayat inspeksi (pencocokan nomor seri tanpa membedakan huruf besar/kecil).
 * Satu unit dianggap sudah diperiksa bila ada inspeksi FINAL; bila hanya ada draft, statusnya DRAFT.
 */
export async function getUnitOverview() {
  const [units, inspections] = await Promise.all([
    db.incomingUnit.findMany({ orderBy: [{ receivedAt: "desc" }, { serialNumber: "asc" }] }),
    db.inspection.findMany({
      select: { id: true, number: true, serialNumber: true, status: true, verdict: true, inspectedAt: true },
      orderBy: { inspectedAt: "desc" },
    }),
  ]);

  type Insp = (typeof inspections)[number];
  const bySerial = new Map<string, Insp[]>();
  for (const i of inspections) {
    const key = norm(i.serialNumber);
    const list = bySerial.get(key);
    if (list) list.push(i);
    else bySerial.set(key, [i]);
  }

  const rows = units.map((u) => {
    const list = bySerial.get(norm(u.serialNumber)) ?? [];
    const finals = list.filter((i) => i.status === "FINAL");
    const latest = finals[0] ?? list[0] ?? null;
    const status: UnitStatus = finals.length ? "FINAL" : list.length ? "DRAFT" : "BELUM";
    return {
      id: u.id,
      serialNumber: u.serialNumber,
      model: u.model,
      receivedAt: u.receivedAt,
      note: u.note,
      status,
      verdict: status === "FINAL" ? (latest?.verdict ?? null) : null,
      inspectionId: latest?.id ?? null,
      inspectionNumber: latest?.number ?? null,
      inspectionCount: list.length,
    };
  });

  const registered = new Set(units.map((u) => norm(u.serialNumber)));
  const unregistered: { serialNumber: string; number: string; id: string; status: "DRAFT" | "FINAL" }[] = [];
  if (units.length) {
    const seen = new Set<string>();
    for (const i of inspections) {
      const key = norm(i.serialNumber);
      if (registered.has(key) || seen.has(key)) continue;
      seen.add(key);
      unregistered.push({ serialNumber: key, number: i.number, id: i.id, status: i.status });
    }
  }

  const summary = {
    total: rows.length,
    belum: rows.filter((r) => r.status === "BELUM").length,
    draft: rows.filter((r) => r.status === "DRAFT").length,
    final: rows.filter((r) => r.status === "FINAL").length,
    pass: rows.filter((r) => r.verdict === "PASS").length,
    fail: rows.filter((r) => r.verdict === "FAIL").length,
    unregistered: unregistered.length,
  };
  return { rows, unregistered, summary };
}
