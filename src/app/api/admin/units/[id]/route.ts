import { requireApiUser } from "@/server/auth/guard";
import { handle, json } from "@/server/http";
import { deleteUnit } from "@/server/services/unit-service";

type Ctx = { params: Promise<{ id: string }> };

export function DELETE(req: Request, { params }: Ctx) {
  return handle(req, async () => {
    const { id } = await params;
    const admin = await requireApiUser(["ADMIN"]);
    await deleteUnit(admin, id);
    return json({ ok: true });
  });
}
