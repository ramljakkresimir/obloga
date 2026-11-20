import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { dohvatiObloge } from "@/lib/data/obloge";
import { dohvatiKategorije } from "@/lib/data/postavke";
import { ListaObloga } from "@/components/obloge/ListaObloga";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "Obloge" };

export default function OblogePage({ searchParams }: PageProps<"/obloge">) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="hidden font-naslov text-2xl leading-8 font-semibold text-espresso lg:block">Obloge</h2>
      <Suspense fallback={<KosturObloga />}>
        <Obloge searchParams={searchParams} />
      </Suspense>

      <Link
        href="/obloge/nova"
        aria-label="Nova obloga"
        className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 flex size-14 items-center justify-center rounded-full bg-narancasta text-espresso shadow-[0_4px_12px_rgb(49_18_18/0.25)] hover:bg-jantar lg:right-8 lg:bottom-8"
      >
        <Plus aria-hidden className="size-7" strokeWidth={2.5} />
      </Link>
    </div>
  );
}

async function Obloge({ searchParams }: Pick<PageProps<"/obloge">, "searchParams">) {
  const [{ k, q }, obloge, kategorije] = await Promise.all([searchParams, dohvatiObloge(), dohvatiKategorije()]);

  return (
    <ListaObloga
      obloge={obloge}
      kategorije={kategorije.map(({ id, naziv }) => ({ id, naziv }))}
      pocetno={{ k: typeof k === "string" ? k : "", q: typeof q === "string" ? q : "" }}
    />
  );
}

function KosturObloga() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-12 w-full" />
      <div className="flex gap-2 overflow-hidden py-1.5">
        {["w-16", "w-36", "w-32", "w-28", "w-24"].map((w, i) => (
          <Skeleton key={i} className={`h-9 shrink-0 rounded-full ${w}`} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-[var(--radius-kartica)] border border-rub bg-povrsina">
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="flex flex-col gap-2 p-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
