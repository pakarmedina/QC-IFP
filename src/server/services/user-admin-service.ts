import { db } from "../db";
import { HttpError } from "../http";
import type { CurrentUser } from "../auth/session";
import type { UserAction } from "@/lib/validators/inspection";

export function listUsers() {
  return db.user.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: { id: true, name: true, username: true, email: true, role: true, status: true, createdAt: true },
  });
}

export async function updateUser(actor: CurrentUser, targetId: string, action: UserAction) {
  const target = await db.user.findUnique({ where: { id: targetId }, select: { id: true, status: true, role: true } });
  if (!target) throw new HttpError(404, "Pengguna tidak ditemukan.");
  if (target.id === actor.id && (action === "disable" || action === "makeQc")) {
    throw new HttpError(400, "Anda tidak bisa menonaktifkan atau menurunkan peran akun Anda sendiri.");
  }

  if (action === "approve") {
    if (target.status !== "PENDING") throw new HttpError(409, "Akun ini tidak sedang menunggu persetujuan.");
    await db.user.update({ where: { id: targetId }, data: { status: "ACTIVE" } });
  } else if (action === "enable") {
    if (target.status !== "DISABLED") throw new HttpError(409, "Akun ini tidak sedang nonaktif.");
    await db.user.update({ where: { id: targetId }, data: { status: "ACTIVE" } });
  } else if (action === "disable") {
    // Sesi dicabut supaya pengguna langsung keluar.
    await db.$transaction([
      db.user.update({ where: { id: targetId }, data: { status: "DISABLED" } }),
      db.session.deleteMany({ where: { userId: targetId } }),
    ]);
  } else if (action === "makeAdmin") {
    await db.user.update({ where: { id: targetId }, data: { role: "ADMIN" } });
  } else {
    await db.user.update({ where: { id: targetId }, data: { role: "QC" } });
  }
  await db.auditLog.create({ data: { userId: actor.id, action: `user.${action}`, entity: "User", entityId: targetId } });
}
