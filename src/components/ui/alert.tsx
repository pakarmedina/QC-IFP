export function Alert({ kind, children }: { kind: "error" | "success"; children: React.ReactNode }) {
  const styles =
    kind === "error"
      ? "border-red-300 bg-red-50 text-red-900"
      : "border-green-300 bg-green-50 text-green-900";
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-lg border px-3 py-2 text-sm ${styles}`}>
      {children}
    </div>
  );
}
