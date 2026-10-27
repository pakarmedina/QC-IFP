import { addUnitsSchema } from "@/lib/validators/unit";
import { requireApiUser } from "@/server/auth/guard";
import { handle, json, readJson } from "@/server/http";
import { addUnits } from "@/server/services/unit-service";

export function POST(req: Request) {
  return handle(req, async () => {
    const admin = await requireApiUser(["ADMIN"]);
    const input = addUnitsSchema.parse(await readJson(req));
    return json(await addUnits(admin, input), 201);
  });
}
