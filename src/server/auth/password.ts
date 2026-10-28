import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";

const ROUNDS = 10;
// Hash tiruan agar waktu respons login mirip baik user ada maupun tidak.
// Dihitung saat pertama dibutuhkan (bukan saat modul dimuat) supaya cold start fungsi tidak tertahan.
let dummyHash: string | null = null;
const getDummyHash = () => (dummyHash ??= bcrypt.hashSync("dummy-password-for-timing", ROUNDS));

export const hashPassword = (plain: string) => bcrypt.hash(plain, ROUNDS);

export async function verifyPassword(plain: string, hash: string | null) {
  const ok = await bcrypt.compare(plain, hash ?? getDummyHash());
  return ok && hash !== null;
}

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
export const randomToken = () => randomBytes(32).toString("base64url");
