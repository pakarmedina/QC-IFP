import { checklistCreateSchema } from "@/lib/validators/checklist";
import { requireApiUser } from "@/server/auth/guard";
import { handle, json, readJson } from "@/server/http";
import { createChecklistItem } from "@/server/services/checklist-service";

export function POST(req: Request) {
  return handle(req, async () => {
    const admin = await requireApiUser(["ADMIN"]);
    const input = checklistCreateSchema.parse(await readJson(req));
    const id = await createChecklistItem(admin, input);
    return json({ id }, 201);
  });
}
