import { createInspectionSchema } from "@/lib/validators/inspection";
import { requireApiUser } from "@/server/auth/guard";
import { handle, json, readJson } from "@/server/http";
import { createInspection } from "@/server/services/inspection-service";

export function POST(req: Request) {
  return handle(req, async () => {
    const user = await requireApiUser();
    const input = createInspectionSchema.parse(await readJson(req));
    const id = await createInspection(user, input);
    return json({ id }, 201);
  });
}
