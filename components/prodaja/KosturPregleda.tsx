import { Skeleton } from "@/components/ui/Skeleton";

/** Kostur pregleda prodaje: segment razdoblja, kartica zbroja i redovi. */
export function KosturPregleda() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-12 w-full lg:w-96" />
      <div className="flex flex-col gap-2 rounded-[var(--radius-kartica)] border border-rub bg-povrsina p-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-5 w-20" />
      </div>
      <div className="flex flex-col divide-y divide-rub rounded-[var(--radius-kartica)] border border-rub bg-povrsina">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-6 w-24 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
