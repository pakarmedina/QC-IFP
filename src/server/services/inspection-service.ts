import { Prisma } from "@prisma/client";
import { db } from "../db";
import { HttpError } from "../http";
import type { CurrentUser } from "../auth/session";
import { formatDate } from "@/lib/format";
import type { ReportData } from "@/lib/export/report";
import type { CreateInspectionInput, SaveInspectionInput } from "@/lib/validators/inspection";

export const PAGE_SIZE = 10;

/** Item bernilai "Tidak" wajib punya keterangan sebelum inspeksi difinalkan. */
const NOTE_REQUIRED_FOR_TIDAK = true;

/** Tanggal YYYY-MM-DD dari form dianggap tanggal WIB. */
function toDbDate(s: string) {
  return new Date(`${s}T00:00:00+07:00`);
}

/** Admin melihat semua inspeksi; Tim QC hanya miliknya. */
function ownScope(user: CurrentUser): Prisma.InspectionWhereInput {
  return user.role === "ADMIN" ? {} : { inspectorId: user.id };
}

function audit(userId: string, action: string, entityId: string) {
  return db.auditLog.create({ data: { userId, action, entity: "Inspection", entityId } });
}

async function nextNumber(ymd: string) {
  const prefix = `QC-${ymd}-`;
  const last = await db.inspection.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const seq = last ? parseInt(last.number.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

/** Inspeksi lain dengan nomor seri yang sama (tanpa membedakan huruf besar/kecil). */
export async function findDuplicateSerials(user: CurrentUser, serialNumber: string, excludeId?: string) {
  const rows = await db.inspection.findMany({
    where: {
      serialNumber: { equals: serialNumber, mode: "insensitive" },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    orderBy: { inspectedAt: "desc" },
    take: 5,
    select: { id: true, number: true, inspectedAt: true, status: true, verdict: true, inspectorId: true },
  });
  // Tim QC hanya boleh membuka inspeksi miliknya; yang lain cukup diberi tahu bahwa ada.
  return rows.map(({ inspectorId, ...r }) => ({ ...r, mine: user.role === "ADMIN" || inspectorId === user.id }));
}

export async function createInspection(user: CurrentUser, input: CreateInspectionInput) {
  if (!input.confirmDuplicate) {
    const duplicates = await findDuplicateSerials(user, input.serialNumber);
    if (duplicates.length) {
      throw new HttpError(409, "Nomor seri ini sudah pernah diinspeksi.", { duplicates });
    }
  }
  const ymd = input.inspectedAt.replace(/-/g, "");
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const inspection = await db.inspection.create({
        data: {
          number: await nextNumber(ymd),
          serialNumber: input.serialNumber,
          site: input.site,
          inspectedAt: toDbDate(input.inspectedAt),
          inspectorId: user.id,
        },
        select: { id: true },
      });
      await audit(user.id, "inspection.create", inspection.id);
      return inspection.id;
    } catch (e) {
      // Dua orang membuat nomor yang sama pada saat bersamaan: coba lagi dengan nomor berikutnya.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }
  throw new HttpError(409, "Gagal membuat nomor inspeksi. Coba lagi.");
}

const detailInclude = {
  inspector: { select: { id: true, name: true, username: true } },
  results: {
    include: { item: { select: { sortOrder: true, category: { select: { sortOrder: true } } } } },
  },
} satisfies Prisma.InspectionInclude;

export async function findInspection(id: string, user: CurrentUser) {
  return db.inspection.findFirst({ where: { id, ...ownScope(user) }, include: detailInclude });
}

export async function getInspection(id: string, user: CurrentUser) {
  const inspection = await findInspection(id, user);
  if (!inspection) throw new HttpError(404, "Inspeksi tidak ditemukan.");
  return inspection;
}

type DetailInspection = NonNullable<Awaited<ReturnType<typeof findInspection>>>;

/** Hasil per kategori, urut sesuai template checklist. */
export function groupResults(results: DetailInspection["results"]) {
  const sorted = [...results].sort(
    (a, b) => a.item.category.sortOrder - b.item.category.sortOrder || a.item.sortOrder - b.item.sortOrder,
  );
  const groups: { name: string; results: typeof sorted }[] = [];
  for (const r of sorted) {
    let g = groups.find((x) => x.name === r.categoryName);
    if (!g) {
      g = { name: r.categoryName, results: [] };
      groups.push(g);
    }
    g.results.push(r);
  }
  return groups;
}

export function getChecklist() {
  return db.checklistCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: { items: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
  });
}

/**
 * Menyimpan inspeksi. Draft disimpan apa adanya. Inspeksi FINAL boleh diperbarui oleh pemiliknya
 * (Tim QC) atau Admin: datanya harus lengkap seperti saat finalisasi, hasil LULUS/GAGAL dihitung ulang,
 * pembaruan dihitung dan dicatat di log audit.
 * Mengembalikan inspeksi lain yang memakai nomor seri sama (hanya peringatan).
 */
export async function saveInspection(id: string, user: CurrentUser, input: SaveInspectionInput) {
  const inspection = await db.inspection.findFirst({
    where: { id, ...ownScope(user) },
    select: { id: true, number: true, status: true, verdict: true },
  });
  if (!inspection) throw new HttpError(404, "Inspeksi tidak ditemukan.");
  const isFinal = inspection.status === "FINAL";

  const ids = input.results.map((r) => r.itemId);
  const [items, existing] = await Promise.all([
    db.checklistItem.findMany({
      where: { id: { in: ids }, isActive: true },
      include: { category: { select: { name: true } } },
    }),
    db.inspectionResult.findMany({ where: { inspectionId: id }, select: { itemId: true, photoUrl: true } }),
  ]);
  const byId = new Map(items.map((i) => [i.id, i]));
  if (byId.size !== ids.length) throw new HttpError(400, "Ada item checklist yang tidak dikenal.");
  const photos = new Map(existing.map((e) => [e.itemId, e.photoUrl]));

  let verdict: "PASS" | "FAIL" | null = null;
  if (isFinal) {
    const active = await db.checklistItem.findMany({
      where: { isActive: true },
      select: { id: true, code: true },
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    });
    const answered = new Set(ids);
    const missing = active.filter((i) => !answered.has(i.id)).map((i) => i.code);
    if (missing.length) {
      throw new HttpError(422, `Masih ada ${missing.length} item yang belum diisi: ${codeList(missing)}.`);
    }
    const noNote = input.results.filter((r) => r.result === "TIDAK" && !r.note?.trim()).map((r) => byId.get(r.itemId)!.code);
    if (noNote.length) {
      throw new HttpError(422, `Item bernilai Tidak wajib diberi keterangan: ${codeList(noNote)}.`);
    }
    verdict = input.results.some((r) => r.result === "TIDAK") ? "FAIL" : "PASS";
  }

  // Sedikit query sengaja: hapus hasil lalu isi ulang sekaligus (foto lama dibawa kembali).
  // Fungsi server Netlify punya batas 10 detik, jadi 58 upsert terpisah terlalu berisiko.
  // Inspeksi final: hasil untuk item yang sudah dinonaktifkan di checklist tetap disimpan.
  const ops: Prisma.PrismaPromise<unknown>[] = [
    db.inspection.update({
      where: { id },
      data: {
        serialNumber: input.serialNumber,
        ...(input.model ? { model: input.model } : {}),
        site: input.site,
        inspectedAt: toDbDate(input.inspectedAt),
        physicalNote: input.physicalNote,
        boxNote: input.boxNote,
        approvedBy: input.approvedBy,
        ...(isFinal ? { verdict, revisionCount: { increment: 1 }, revisedAt: new Date() } : {}),
      },
    }),
    db.inspectionResult.deleteMany({
      where: isFinal ? { inspectionId: id, itemId: { in: ids } } : { inspectionId: id },
    }),
    db.inspectionResult.createMany({
      data: input.results.map((r) => {
        const item = byId.get(r.itemId)!;
        return {
          inspectionId: id,
          itemId: item.id,
          itemCode: item.code,
          categoryName: item.category.name,
          itemLabel: item.label,
          standard: item.standard,
          requiresPhoto: item.requiresPhoto,
          result: r.result,
          note: r.note,
          photoUrl: photos.get(r.itemId) ?? null,
        };
      }),
    }),
  ];
  if (isFinal) {
    ops.push(audit(user.id, "inspection.update", id));
    // Hasil berubah menjadi GAGAL: beri tahu Admin lain, sama seperti saat finalisasi.
    if (verdict === "FAIL" && inspection.verdict !== "FAIL") {
      const admins = await db.user.findMany({
        where: { role: "ADMIN", status: "ACTIVE", NOT: { id: user.id } },
        select: { id: true },
      });
      if (admins.length) {
        ops.push(
          db.notification.createMany({
            data: admins.map((a) => ({
              userId: a.id,
              title: "Inspeksi diperbarui menjadi GAGAL",
              body: `${inspection.number} (SN ${input.serialNumber}) kini memiliki item bernilai Tidak.`,
            })),
          }),
        );
      }
    }
  }
  await db.$transaction(ops);
  return findDuplicateSerials(user, input.serialNumber, id);
}

function codeList(codes: string[]) {
  return codes.length > 10 ? `${codes.slice(0, 10).join(", ")}, ...` : codes.join(", ");
}

/** Memvalidasi data yang SUDAH tersimpan, lalu mengunci inspeksi dan menentukan LULUS/GAGAL. */
export async function finalizeInspection(id: string, user: CurrentUser) {
  const inspection = await db.inspection.findFirst({
    where: { id, ...ownScope(user) },
    include: { results: true },
  });
  if (!inspection) throw new HttpError(404, "Inspeksi tidak ditemukan.");
  if (inspection.status !== "DRAFT") throw new HttpError(409, "Inspeksi ini sudah final.");

  const active = await db.checklistItem.findMany({
    where: { isActive: true },
    select: { id: true, code: true },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });
  const answered = new Set(inspection.results.map((r) => r.itemId));
  const missing = active.filter((i) => !answered.has(i.id)).map((i) => i.code);
  if (missing.length) {
    throw new HttpError(422, `Masih ada ${missing.length} item yang belum diisi: ${codeList(missing)}.`);
  }
  if (NOTE_REQUIRED_FOR_TIDAK) {
    const noNote = inspection.results.filter((r) => r.result === "TIDAK" && !r.note?.trim()).map((r) => r.itemCode);
    if (noNote.length) {
      throw new HttpError(422, `Item bernilai Tidak wajib diberi keterangan: ${codeList(noNote)}.`);
    }
  }

  const verdict = inspection.results.some((r) => r.result === "TIDAK") ? "FAIL" : "PASS";
  const ops: Prisma.PrismaPromise<unknown>[] = [
    db.inspection.update({ where: { id }, data: { status: "FINAL", verdict } }),
    audit(user.id, "inspection.finalize", id),
  ];
  if (verdict === "FAIL") {
    const admins = await db.user.findMany({
      where: { role: "ADMIN", status: "ACTIVE", NOT: { id: user.id } },
      select: { id: true },
    });
    if (admins.length) {
      ops.push(
        db.notification.createMany({
          data: admins.map((a) => ({
            userId: a.id,
            title: "Inspeksi dinyatakan GAGAL",
            body: `${inspection.number} (SN ${inspection.serialNumber}) memiliki item bernilai Tidak.`,
          })),
        }),
      );
    }
  }
  await db.$transaction(ops);
  return verdict;
}

export async function deleteInspection(id: string, user: CurrentUser) {
  const inspection = await db.inspection.findFirst({
    where: { id, ...ownScope(user) },
    select: { id: true, status: true },
  });
  if (!inspection) throw new HttpError(404, "Inspeksi tidak ditemukan.");
  if (user.role !== "ADMIN" && inspection.status !== "DRAFT") {
    throw new HttpError(403, "Hanya Admin yang dapat menghapus inspeksi final.");
  }
  await db.$transaction([db.inspection.delete({ where: { id } }), audit(user.id, "inspection.delete", id)]);
}

export type ListParams = {
  q?: string;
  status?: "DRAFT" | "FINAL";
  verdict?: "PASS" | "FAIL";
  from?: string;
  to?: string;
  month?: string; // YYYY-MM
  sort: "newest" | "oldest" | "serial";
  page: number;
};

function buildListQuery(user: CurrentUser, p: ListParams) {
  const and: Prisma.InspectionWhereInput[] = [ownScope(user)];
  if (p.q) {
    and.push({
      OR: [
        { serialNumber: { contains: p.q, mode: "insensitive" } },
        { number: { contains: p.q, mode: "insensitive" } },
        { inspector: { name: { contains: p.q, mode: "insensitive" } } },
      ],
    });
  }
  if (p.status) and.push({ status: p.status });
  if (p.verdict) and.push({ verdict: p.verdict });
  if (p.from) and.push({ inspectedAt: { gte: toDbDate(p.from) } });
  if (p.to) and.push({ inspectedAt: { lte: toDbDate(p.to) } });
  if (p.month) {
    const [y, m] = p.month.split("-").map(Number);
    const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
    and.push({ inspectedAt: { gte: toDbDate(`${p.month}-01`), lt: toDbDate(next) } });
  }
  const where: Prisma.InspectionWhereInput = { AND: and };

  const orderBy: Prisma.InspectionOrderByWithRelationInput[] =
    p.sort === "oldest"
      ? [{ inspectedAt: "asc" }, { createdAt: "asc" }]
      : p.sort === "serial"
        ? [{ serialNumber: "asc" }]
        : [{ inspectedAt: "desc" }, { createdAt: "desc" }];

  return { where, orderBy };
}

export async function listInspections(user: CurrentUser, p: ListParams) {
  const { where, orderBy } = buildListQuery(user, p);
  const total = await db.inspection.count({ where });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, p.page), pages);
  const items = await db.inspection.findMany({
    where,
    orderBy,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: { inspector: { select: { name: true } } },
  });
  return { items, total, page, pages };
}

const REPORT_MAX_ROWS = 5000;

/** Semua inspeksi yang cocok dengan filter (tanpa halaman) untuk laporan Excel. */
export async function listForReport(user: CurrentUser, p: ListParams) {
  const { where, orderBy } = buildListQuery(user, p);
  return db.inspection.findMany({
    where,
    orderBy,
    take: REPORT_MAX_ROWS,
    include: { inspector: { select: { name: true } } },
  });
}

/** Jumlah inspeksi final LULUS/GAGAL per bulan (WIB) untuk beberapa bulan terakhir. */
export async function getMonthlyStats(user: CurrentUser, months = 6) {
  const tz = "Asia/Jakarta";
  const monthKey = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: tz }).slice(0, 7);
  const [y0, m0] = monthKey(new Date()).split("-").map(Number);
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const idx = y0 * 12 + (m0 - 1) - i;
    keys.push(`${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`);
  }
  const rows = await db.inspection.findMany({
    where: { ...ownScope(user), status: "FINAL", inspectedAt: { gte: toDbDate(`${keys[0]}-01`) } },
    select: { inspectedAt: true, verdict: true },
  });
  const byKey = new Map(keys.map((k) => [k, { pass: 0, fail: 0 }]));
  for (const r of rows) {
    const b = byKey.get(monthKey(r.inspectedAt));
    if (!b) continue;
    if (r.verdict === "PASS") b.pass++;
    else if (r.verdict === "FAIL") b.fail++;
  }
  return keys.map((key) => ({
    key,
    label: new Date(`${key}-15T00:00:00+07:00`).toLocaleDateString("id-ID", { month: "short", timeZone: tz }),
    ...byKey.get(key)!,
  }));
}

export async function getDashboardStats(user: CurrentUser) {
  const scope = ownScope(user);
  const [total, drafts, pass, fail, recent, topFails] = await Promise.all([
    db.inspection.count({ where: scope }),
    db.inspection.count({ where: { ...scope, status: "DRAFT" } }),
    db.inspection.count({ where: { ...scope, status: "FINAL", verdict: "PASS" } }),
    db.inspection.count({ where: { ...scope, status: "FINAL", verdict: "FAIL" } }),
    db.inspection.findMany({
      where: scope,
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { inspector: { select: { name: true } } },
    }),
    db.inspectionResult.groupBy({
      by: ["itemCode", "itemLabel"],
      where: { result: "TIDAK", inspection: { ...scope, status: "FINAL" } },
      _count: { _all: true },
      orderBy: { _count: { itemCode: "desc" } },
      take: 5,
    }),
  ]);
  return { total, drafts, pass, fail, recent, topFails };
}

/** Data laporan (PDF/Excel) dari satu inspeksi; dipakai halaman detail dan daftar riwayat. */
export function toReportData(inspection: DetailInspection): ReportData {
  return {
    number: inspection.number,
    serialNumber: inspection.serialNumber,
    model: inspection.model,
    site: inspection.site,
    inspectedAt: formatDate(inspection.inspectedAt),
    inspector: inspection.inspector.name,
    approvedBy: inspection.approvedBy,
    physicalNote: inspection.physicalNote,
    boxNote: inspection.boxNote,
    verdict: inspection.verdict,
    categories: groupResults(inspection.results).map((g) => ({
      name: g.name,
      items: g.results.map((r) => ({
        itemId: r.itemId,
        code: r.itemCode,
        label: r.itemLabel,
        standard: r.standard,
        result: r.result,
        note: r.note,
        requiresPhoto: r.requiresPhoto,
      })),
    })),
  };
}
