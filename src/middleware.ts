import { NextResponse, type NextRequest } from "next/server";

// Pemeriksaan ringan (hanya keberadaan cookie). Validasi sesi sebenarnya dilakukan di server
// pada setiap halaman/API lewat requirePageUser / requireApiUser.
export function middleware(req: NextRequest) {
  if (!req.cookies.get("qc_session")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/inspections/:path*", "/notifications/:path*", "/profile/:path*", "/admin/:path*"],
};
