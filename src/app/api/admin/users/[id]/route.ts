import { userActionSchema } from "@/lib/validators/inspection";
import { requireApiUser } from "@/server/auth/guard";
import { handle, json, readJson } from "@/server/http";
import { updateUser } from "@/server/services/user-admin-service";

export function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(req, async () => {
    const { id } = await params;
    const admin = await requireApiUser(["ADMIN"]);
    const { action } = userActionSchema.parse(await readJson(req));
    await updateUser(admin, id, action);
    return json({ ok: true });
  });
}
