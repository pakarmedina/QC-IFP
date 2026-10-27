import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import type { CurrentUser } from "@/server/auth/session";

export function AppHeader({ user }: { user: CurrentUser }) {
  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/inspections", label: "Inspeksi" },
    ...(user.role === "ADMIN" ? [{ href: "/admin/users", label: "Pengguna" }, { href: "/admin/checklist", label: "Checklist" }] : []),
  ];
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <nav aria-label="Navigasi utama" className="flex flex-wrap items-center gap-1">
          <span className="mr-3 text-sm font-bold text-brand-800">QC IFP</span>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <p className="text-sm text-slate-600">
            {user.name} · {user.role === "ADMIN" ? "Admin" : "Tim QC"}
          </p>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
