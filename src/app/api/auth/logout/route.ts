import { destroySession } from "@/server/auth/session";
import { handle, json } from "@/server/http";

export function POST(req: Request) {
  return handle(req, async () => {
    await destroySession();
    return json({ ok: true });
  });
}
