import type { Metadata } from "next";
import { Suspense } from "react";
import { dohvatiObloge } from "@/lib/data/obloge";
import { dohvatiKategorije } from "@/lib/data/postavke";
import { UlazRobe } from "@/components/obloge/UlazRobe";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "Ulaz robe" };

/** Skupni ulaz robe (PRD §5.4): sve aktivne obloge, količina samo kod onih koje su stigle, jedno „Spremi". */
export default function UlazRobePage() {
  return (
    <Suspense fallback={<KosturUlaza />}>
      <Ulaz />
    </Suspense>
  );
}

async function Ulaz() {
  const [obloge, kategorije] = await Promise.all([dohvatiObloge(), dohvatiKategorije()]);
  const aktivne = obloge.filter((o) => o.aktivan);

  return (
    <UlazRobe
      obloge={aktivne.map(({ id, naziv, slika, kategorija_id, stanje }) => ({ id, naziv, slika, kategorija_id, stanje }))}
      kategorije={kategorije
        .filter((k) => aktivne.some((o) => o.kategorija_id === k.id))
        .map(({ id, naziv }) => ({ id, naziv }))}
    />
  );
}

function KosturUlaza() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-12 w-full" />
      <div className="flex gap-2 overflow-hidden py-1.5">
        {["w-16", "w-36", "w-32", "w-28", "w-24"].map((w, i) => (
          <Skeleton key={i} className={`h-9 shrink-0 rounded-full ${w}`} />
        ))}
      </div>
      <div className="flex flex-col divide-y divide-rub rounded-[var(--radius-kartica)] border border-rub bg-povrsina">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="size-12 shrink-0" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-12 w-36 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
