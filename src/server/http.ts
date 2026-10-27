import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

/** Tolak request mutasi dari origin lain (perlindungan CSRF tambahan di atas SameSite=Lax). */
function assertSameOrigin(req: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) {
    throw new HttpError(403, "Permintaan ditolak.");
  }
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function handle(req: Request, fn: () => Promise<Response>) {
  try {
    assertSameOrigin(req);
    return await fn();
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    if (e instanceof ZodError) {
      return json({ error: "Input tidak valid.", fields: e.flatten().fieldErrors }, 400);
    }
    console.error(e);
    return json({ error: "Terjadi kesalahan pada server." }, 500);
  }
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Body permintaan harus berupa JSON.");
  }
}
