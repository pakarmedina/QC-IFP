import { AppHeader } from "@/components/layout/app-header";
import { UserActions } from "@/components/admin/user-actions";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { requirePageUser } from "@/server/auth/guard";
import { listUsers } from "@/server/services/user-admin-service";

export const metadata = { title: "Pengguna" };
export const dynamic = "force-dynamic";

const STATUS = {
  PENDING: { label: "Menunggu persetujuan", tone: "amber" },
  ACTIVE: { label: "Aktif", tone: "green" },
  DISABLED: { label: "Nonaktif", tone: "slate" },
} as const;

export default async function AdminUsersPage() {
  const admin = await requirePageUser(["ADMIN"]);
  const users = await listUsers();
  return (
    <>
      <AppHeader user={admin} />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold">Pengguna</h1>
        <p className="mt-1 text-sm text-slate-600">Setujui pendaftar baru, nonaktifkan akun, atau ubah peran.</p>
        <ul className="mt-6 divide-y divide-slate-200 rounded-xl bg-white ring-1 ring-slate-200">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold">
                  {u.name} <span className="font-normal text-slate-600">@{u.username}</span>
                </p>
                <p className="text-sm text-slate-600">
                  {u.email} · terdaftar {formatDate(u.createdAt)}
                </p>
                <div className="mt-2 flex gap-2">
                  <Badge tone={STATUS[u.status].tone}>{STATUS[u.status].label}</Badge>
                  <Badge tone="slate">{u.role === "ADMIN" ? "Admin" : "Tim QC"}</Badge>
                </div>
              </div>
              <UserActions userId={u.id} status={u.status} role={u.role} isSelf={u.id === admin.id} />
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
