import { checklistPatchSchema } from "@/lib/validators/checklist";
import { requireApiUser } from "@/server/auth/guard";
import { handle, json, readJson } from "@/server/http";
import { deleteChecklistItem, updateChecklistItem } from "@/server/services/checklist-service";

type Ctx = { params: Promise<{ id: string }> };

export function PATCH(req: Request, { params }: Ctx) {
  return handle(req, async () => {
    const { id } = await params;
    const admin = await requireApiUser(["ADMIN"]);
    const patch = checklistPatchSchema.parse(await readJson(req));
    await updateChecklistItem(admin, id, patch);
    return json({ ok: true });
  });
}

export function DELETE(req: Request, { params }: Ctx) {
  return handle(req, async () => {
    const { id } = await params;
    const admin = await requireApiUser(["ADMIN"]);
    await deleteChecklistItem(admin, id);
    return json({ ok: true });
  });
}
