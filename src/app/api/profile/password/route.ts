import { cookies } from "next/headers";
import { changePasswordSchema } from "@/lib/validators/auth";
import { sha256 } from "@/server/auth/password";
import { requireApiUser } from "@/server/auth/guard";
import { SESSION_COOKIE } from "@/server/auth/session";
import { handle, json, readJson } from "@/server/http";
import { changePassword } from "@/server/services/profile-service";

export function POST(req: Request) {
  return handle(req, async () => {
    const user = await requireApiUser();
    const input = changePasswordSchema.parse(await readJson(req));
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    await changePassword(user, token ? sha256(token) : null, input.currentPassword, input.password);
    return json({ ok: true });
  });
}
