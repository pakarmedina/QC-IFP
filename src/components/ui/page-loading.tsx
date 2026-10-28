/** Tampilan sementara saat halaman dimuat dari server, supaya ketukan langsung terasa direspons. */
export function PageLoading() {
  return (
    <>
      <div className="h-[61px] border-b border-slate-200 bg-white" aria-hidden="true" />
      <main className="mx-auto max-w-5xl px-4 py-8" role="status" aria-live="polite">
        <span className="sr-only">Memuat...</span>
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-6 space-y-3">
          <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
        </div>
      </main>
    </>
  );
}
