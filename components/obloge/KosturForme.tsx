import { Skeleton } from "@/components/ui/Skeleton";

/** Skeleton za formu obloge (nova / uredi). */
export function KosturForme() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <Skeleton className="aspect-[4/3] w-full rounded-[var(--radius-kartica)]" />
      {[2, 3, 2].map((polja, i) => (
        <div key={i} className="flex flex-col gap-4 rounded-[var(--radius-kartica)] border border-rub bg-povrsina p-4">
          <Skeleton className="h-6 w-32" />
          {Array.from({ length: polja }, (_, j) => (
            <Skeleton key={j} className="h-12 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}
