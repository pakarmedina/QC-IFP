import { loginSchema } from "@/lib/validators/auth";
import { createSession } from "@/server/auth/session";
import { clientIp, handle, json, readJson } from "@/server/http";
import { rateLimit, resetRateLimit } from "@/server/rate-limit";
import { authenticate } from "@/server/services/auth-service";

export function POST(req: Request) {
  return handle(req, async () => {
    const input = loginSchema.parse(await readJson(req));
    const key = `login:${clientIp(req)}:${input.identifier}`;
    rateLimit(key, 10, 15 * 60_000);
    const user = await authenticate(input.identifier, input.password);
    resetRateLimit(key);
    await createSession(user.id, req.headers.get("user-agent"));
    return json({ ok: true });
  });
}
