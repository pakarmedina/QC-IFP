import { cookies } from "next/headers";
import { db } from "../db";
import { randomToken, sha256 } from "./password";

export const SESSION_COOKIE = "qc_session";
const SESSION_DAYS = 7;

export async function createSession(userId: string, userAgent: string | null) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  // Yang disimpan di DB hanya hash token: bocornya DB tidak membocorkan sesi aktif.
  await db.session.create({
    data: { id: sha256(token), userId, expiresAt, userAgent: userAgent?.slice(0, 200) ?? null },
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: sha256(token) } });
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: sha256(token) },
    include: {
      user: { select: { id: true, name: true, username: true, email: true, role: true, status: true } },
    },
  });
  if (!session || session.expiresAt < new Date() || session.user.status !== "ACTIVE") return null;
  return session.user;
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
