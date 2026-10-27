const tones = {
  green: "bg-green-100 text-green-900 ring-green-300",
  red: "bg-red-100 text-red-900 ring-red-300",
  amber: "bg-amber-100 text-amber-900 ring-amber-300",
  slate: "bg-slate-100 text-slate-800 ring-slate-300",
} as const;

export function Badge({ tone, children }: { tone: keyof typeof tones; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: "DRAFT" | "FINAL" }) {
  return <Badge tone={status === "FINAL" ? "slate" : "amber"}>{status === "FINAL" ? "Final" : "Draft"}</Badge>;
}

export function VerdictBadge({ verdict }: { verdict: "PASS" | "FAIL" | null }) {
  if (!verdict) return <span className="text-xs text-slate-500">Belum ada hasil</span>;
  return <Badge tone={verdict === "PASS" ? "green" : "red"}>{verdict === "PASS" ? "LULUS" : "GAGAL"}</Badge>;
}
