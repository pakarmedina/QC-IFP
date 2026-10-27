import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";

const ROUNDS = 12;
// Hash tiruan agar waktu respons login sama baik user ada maupun tidak.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", ROUNDS);

export const hashPassword = (plain: string) => bcrypt.hash(plain, ROUNDS);

export async function verifyPassword(plain: string, hash: string | null) {
  const ok = await bcrypt.compare(plain, hash ?? DUMMY_HASH);
  return ok && hash !== null;
}

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
export const randomToken = () => randomBytes(32).toString("base64url");
