import { requireApiUser } from "@/server/auth/guard";
import { handle, json } from "@/server/http";
import { finalizeInspection } from "@/server/services/inspection-service";

export function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(req, async () => {
    const { id } = await params;
    const user = await requireApiUser();
    const verdict = await finalizeInspection(id, user);
    return json({ ok: true, verdict });
  });
}
