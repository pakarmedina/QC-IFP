import Link from "next/link";
import { formatDate } from "@/lib/format";

export type DuplicateInspection = {
  id: string;
  number: string;
  inspectedAt: string;
  status: "DRAFT" | "FINAL";
  verdict: "PASS" | "FAIL" | null;
  mine: boolean;
};

function describe(d: DuplicateInspection) {
  const state = d.status === "DRAFT" ? "Draft" : d.verdict === "PASS" ? "Final, lulus" : "Final, gagal";
  return `${formatDate(d.inspectedAt)} · ${state}`;
}

export function DuplicateList({ items }: { items: DuplicateInspection[] }) {
  return (
    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
      {items.map((d) => (
        <li key={d.id}>
          {d.mine ? (
            <Link href={`/inspections/${d.id}`} className="font-semibold underline" target="_blank">
              {d.number}
            </Link>
          ) : (
            <span className="font-semibold">{d.number}</span>
          )}{" "}
          ({describe(d)})
        </li>
      ))}
    </ul>
  );
}
