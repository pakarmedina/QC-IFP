import { saveInspectionSchema } from "@/lib/validators/inspection";
import { requireApiUser } from "@/server/auth/guard";
import { handle, json, readJson } from "@/server/http";
import { deleteInspection, saveInspection } from "@/server/services/inspection-service";

type Ctx = { params: Promise<{ id: string }> };

export function PUT(req: Request, { params }: Ctx) {
  return handle(req, async () => {
    const { id } = await params;
    const user = await requireApiUser();
    const input = saveInspectionSchema.parse(await readJson(req));
    const duplicates = await saveInspection(id, user, input);
    return json({ ok: true, duplicates });
  });
}

export function DELETE(req: Request, { params }: Ctx) {
  return handle(req, async () => {
    const { id } = await params;
    const user = await requireApiUser();
    await deleteInspection(id, user);
    return json({ ok: true });
  });
}
