import { Prisma } from "@prisma/client";
import { db } from "../db";
import { HttpError } from "../http";
import type { CurrentUser } from "../auth/session";
import type { ChecklistCreateInput, ChecklistPatchInput } from "@/lib/validators/checklist";

function audit(userId: string, action: string, entityId: string) {
  return db.auditLog.create({ data: { userId, action, entity: "ChecklistItem", entityId } });
}

/** Semua item (aktif maupun nonaktif) beserta jumlah pemakaiannya di inspeksi. */
export function listChecklistForAdmin() {
  return db.checklistCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      items: { orderBy: { sortOrder: "asc" }, include: { _count: { select: { results: true } } } },
    },
  });
}

export async function createChecklistItem(actor: CurrentUser, input: ChecklistCreateInput) {
  const category = await db.checklistCategory.findUnique({
    where: { id: input.categoryId },
    include: { items: { select: { code: true, sortOrder: true } } },
  });
  if (!category) throw new HttpError(404, "Kategori tidak ditemukan.");
  const maxNumber = Math.max(0, ...category.items.map((i) => parseInt(i.code.slice(category.code.length), 10) || 0));
  const maxSort = Math.max(0, ...category.items.map((i) => i.sortOrder));
  try {
    const item = await db.checklistItem.create({
      data: {
        categoryId: category.id,
        code: `${category.code}${maxNumber + 1}`,
        label: input.label,
        standard: input.standard || null,
        requiresPhoto: input.requiresPhoto,
        sortOrder: maxSort + 1,
      },
      select: { id: true },
    });
    await audit(actor.id, "checklist.create", item.id);
    return item.id;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HttpError(409, "Kode item bentrok. Coba lagi.");
    }
    throw e;
  }
}

export async function updateChecklistItem(actor: CurrentUser, id: string, patch: ChecklistPatchInput) {
  const item = await db.checklistItem.findUnique({
    where: { id },
    select: { id: true, categoryId: true, sortOrder: true },
  });
  if (!item) throw new HttpError(404, "Item tidak ditemukan.");

  if (patch.move) {
    const siblings = await db.checklistItem.findMany({
      where: { categoryId: item.categoryId },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      select: { id: true, sortOrder: true },
    });
    const index = siblings.findIndex((s) => s.id === id);
    const other = siblings[patch.move === "up" ? index - 1 : index + 1];
    if (!other) return; // sudah di ujung daftar
    await db.$transaction([
      db.checklistItem.update({ where: { id }, data: { sortOrder: other.sortOrder } }),
      db.checklistItem.update({ where: { id: other.id }, data: { sortOrder: item.sortOrder } }),
    ]);
  } else {
    const data: Prisma.ChecklistItemUpdateInput = {};
    if (patch.label !== undefined) data.label = patch.label;
    if (patch.standard !== undefined) data.standard = patch.standard || null;
    if (patch.requiresPhoto !== undefined) data.requiresPhoto = patch.requiresPhoto;
    if (patch.isActive !== undefined) data.isActive = patch.isActive;
    await db.checklistItem.update({ where: { id }, data });
  }
  await audit(actor.id, "checklist.update", id);
}

export async function deleteChecklistItem(actor: CurrentUser, id: string) {
  const item = await db.checklistItem.findUnique({
    where: { id },
    select: { id: true, _count: { select: { results: true } } },
  });
  if (!item) throw new HttpError(404, "Item tidak ditemukan.");
  if (item._count.results > 0) {
    throw new HttpError(
      409,
      `Item ini sudah dipakai di ${item._count.results} hasil inspeksi, jadi tidak bisa dihapus. Nonaktifkan saja.`,
    );
  }
  await db.$transaction([db.checklistItem.delete({ where: { id } }), audit(actor.id, "checklist.delete", id)]);
}
