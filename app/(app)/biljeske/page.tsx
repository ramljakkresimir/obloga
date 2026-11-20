import type { Metadata } from "next";
import { Suspense } from "react";
import { dohvatiBiljeske } from "@/lib/data/biljeske";
import { ListaBiljeski } from "@/components/biljeske/ListaBiljeski";
import { NovaBiljeska } from "@/components/biljeske/NovaBiljeska";
import { PretragaBiljeski } from "@/components/biljeske/PretragaBiljeski";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "Bilješke" };

export default function BiljeskePage({ searchParams }: PageProps<"/biljeske">) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <h2 className="hidden font-naslov text-2xl leading-8 font-semibold text-espresso lg:block">Bilješke</h2>
      <NovaBiljeska />
      <Suspense fallback={<KosturBiljeski />}>
        <Biljeske searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Biljeske({ searchParams }: Pick<PageProps<"/biljeske">, "searchParams">) {
  const { q } = await searchParams;
  const pretraga = typeof q === "string" ? q.trim() : "";
  const biljeske = await dohvatiBiljeske(pretraga);

  return (
    <>
      {(biljeske.length > 0 || pretraga) && <PretragaBiljeski pocetno={pretraga} />}
      <ListaBiljeski biljeske={biljeske} pretraga={pretraga} />
    </>
  );
}

function KosturBiljeski() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-12 w-full" />
      <div className="flex flex-col gap-4 rounded-[var(--radius-kartica)] border border-rub bg-povrsina p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="size-6 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
