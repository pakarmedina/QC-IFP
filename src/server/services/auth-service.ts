import { db } from "../db";
import { HttpError } from "../http";
import { hashPassword, randomToken, sha256, verifyPassword } from "../auth/password";
import { sendMail } from "../mail";
import type { RegisterInput } from "@/lib/validators/auth";

export async function registerUser(input: RegisterInput) {
  const exists = await db.user.findFirst({
    where: { OR: [{ username: input.username }, { email: input.email }] },
    select: { id: true },
  });
  if (exists) throw new HttpError(409, "Username atau email sudah digunakan.");

  const user = await db.user.create({
    data: {
      name: input.name,
      username: input.username,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      role: "QC",
      status: "PENDING",
    },
  });

  const admins = await db.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true } });
  if (admins.length) {
    await db.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        title: "Akun baru menunggu persetujuan",
        body: `${user.name} (@${user.username}) mendaftar sebagai Tim QC.`,
      })),
    });
  }
  return user.id;
}

/** Mengembalikan user bila kredensial benar dan akun aktif; selain itu melempar HttpError. */
export async function authenticate(identifier: string, password: string) {
  const user = await db.user.findFirst({
    where: { OR: [{ username: identifier }, { email: identifier }] },
  });
  const ok = await verifyPassword(password, user?.passwordHash ?? null);
  if (!user || !ok) throw new HttpError(401, "Username/email atau kata sandi salah.");
  if (user.status === "PENDING") throw new HttpError(403, "Akun Anda belum disetujui Admin.");
  if (user.status === "DISABLED") throw new HttpError(403, "Akun Anda dinonaktifkan. Hubungi Admin.");
  return user;
}

export async function requestPasswordReset(email: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.status !== "ACTIVE") return; // respons ke klien tetap sama
  const token = randomToken();
  await db.passwordResetToken.create({
    data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60 * 60_000) },
  });
  const link = `${process.env.APP_URL ?? "http://localhost:3000"}/reset-password/${token}`;
  await sendMail(
    user.email,
    "Reset kata sandi QC IFP",
    `Halo ${user.name},\n\nKlik tautan berikut untuk mengatur kata sandi baru (berlaku 1 jam):\n${link}\n\nAbaikan email ini bila Anda tidak memintanya.`,
  );
}

export async function resetPassword(token: string, newPassword: string) {
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new HttpError(400, "Tautan reset tidak valid atau sudah kedaluwarsa.");
  }
  const passwordHash = await hashPassword(newPassword);
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.session.deleteMany({ where: { userId: record.userId } }), // cabut semua sesi lama
  ]);
}
