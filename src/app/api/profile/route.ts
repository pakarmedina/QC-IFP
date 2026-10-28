import { profileSchema } from "@/lib/validators/auth";
import { requireApiUser } from "@/server/auth/guard";
import { handle, json, readJson } from "@/server/http";
import { updateProfile } from "@/server/services/profile-service";

export function POST(req: Request) {
  return handle(req, async () => {
    const user = await requireApiUser();
    await updateProfile(user, profileSchema.parse(await readJson(req)));
    return json({ ok: true });
  });
}
