import { forgotPasswordSchema } from "@/lib/validators/auth";
import { clientIp, handle, json, readJson } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { requestPasswordReset } from "@/server/services/auth-service";

export function POST(req: Request) {
  return handle(req, async () => {
    rateLimit(`forgot:${clientIp(req)}`, 5, 60 * 60_000);
    const { email } = forgotPasswordSchema.parse(await readJson(req));
    await requestPasswordReset(email);
    // Respons selalu sama agar tidak membocorkan email mana yang terdaftar.
    return json({ ok: true });
  });
}
