import { resetPasswordSchema } from "@/lib/validators/auth";
import { clientIp, handle, json, readJson } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { resetPassword } from "@/server/services/auth-service";

export function POST(req: Request) {
  return handle(req, async () => {
    rateLimit(`reset:${clientIp(req)}`, 10, 60 * 60_000);
    const { token, password } = resetPasswordSchema.parse(await readJson(req));
    await resetPassword(token, password);
    return json({ ok: true });
  });
}
