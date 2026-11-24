import { Skeleton } from "@/components/ui/Skeleton";

/** Kostur uređivača predračuna dok se učitavaju obloge i postavke. */
export function KosturUredivaca() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
      <div className="flex flex-col gap-4">
        {["h-40", "h-28", "h-36", "h-20"].map((h, i) => (
          <Skeleton key={i} className={`w-full rounded-[var(--radius-kartica)] ${h}`} />
        ))}
      </div>
      <Skeleton className="hidden h-72 rounded-[var(--radius-kartica)] lg:block" />
    </div>
  );
}

/** Kostur detalja predračuna. */
export function KosturDetalja() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-24 w-full rounded-[var(--radius-kartica)]" />
      <Skeleton className="h-56 w-full rounded-[var(--radius-kartica)]" />
      <Skeleton className="h-40 w-full rounded-[var(--radius-kartica)]" />
    </div>
  );
}

/** Kostur liste predračuna. */
export function KosturListe() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-12 w-full" />
      <div className="flex gap-2 overflow-hidden py-1.5">
        {["w-24", "w-24", "w-24", "w-24", "w-14"].map((w, i) => (
          <Skeleton key={i} className={`h-9 shrink-0 rounded-full ${w}`} />
        ))}
      </div>
      <div className="flex flex-col divide-y divide-rub rounded-[var(--radius-kartica)] border border-rub bg-povrsina">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-3/4" />
            </div>
            <Skeleton className="h-6 w-24 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
