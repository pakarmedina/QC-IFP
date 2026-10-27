import type { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { HttpError } from "../http";
import { getCurrentUser } from "./session";

/** Untuk route handler: melempar 401/403. */
export async function requireApiUser(roles?: Role[]) {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Silakan login terlebih dahulu.");
  if (roles && !roles.includes(user.role)) throw new HttpError(403, "Anda tidak punya akses.");
  return user;
}

/** Untuk halaman server: redirect ke /login bila belum login. */
export async function requirePageUser(roles?: Role[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect("/dashboard");
  return user;
}
