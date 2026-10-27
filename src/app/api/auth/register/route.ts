import { registerSchema } from "@/lib/validators/auth";
import { clientIp, handle, json, readJson } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { registerUser } from "@/server/services/auth-service";

export function POST(req: Request) {
  return handle(req, async () => {
    rateLimit(`register:${clientIp(req)}`, 5, 60 * 60_000);
    const input = registerSchema.parse(await readJson(req));
    await registerUser(input);
    return json({ ok: true }, 201);
  });
}
