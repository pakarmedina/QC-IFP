import { db } from "../db";
import { HttpError } from "../http";
import { hashPassword, verifyPassword } from "../auth/password";
import { rateLimit } from "../rate-limit";
import type { CurrentUser } from "../auth/session";
import type { ProfileInput } from "@/lib/validators/auth";

export async function updateProfile(user: CurrentUser, input: ProfileInput) {
  if (input.email !== user.email) {
    const taken = await db.user.findFirst({ where: { email: input.email, NOT: { id: user.id } }, select: { id: true } });
    if (taken) throw new HttpError(409, "Email sudah digunakan akun lain.");
  }
  await db.user.update({ where: { id: user.id }, data: { name: input.name, email: input.email } });
}

/** Ganti kata sandi; sesi di perangkat lain dicabut, sesi yang sedang dipakai tetap berjalan. */
export async function changePassword(user: CurrentUser, currentSessionId: string | null, currentPassword: string, newPassword: string) {
  rateLimit(`pwd:${user.id}`, 5, 15 * 60_000);
  const record = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  const ok = await verifyPassword(currentPassword, record?.passwordHash ?? null);
  if (!ok) throw new HttpError(400, "Kata sandi saat ini salah.", { fields: { currentPassword: ["Kata sandi saat ini salah"] } });
  const passwordHash = await hashPassword(newPassword);
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash } }),
    db.session.deleteMany({ where: { userId: user.id, ...(currentSessionId ? { NOT: { id: currentSessionId } } : {}) } }),
  ]);
}
