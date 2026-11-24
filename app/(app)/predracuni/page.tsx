import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import {
  dohvatiPredracune,
  filterIzParametra,
  FILTERI_STATUSA,
  ZADANI_FILTER,
} from "@/lib/data/predracuni";
import { KosturListe } from "@/components/predracun/Kosturi";
import { ListaPredracuna } from "@/components/predracun/ListaPredracuna";

export const metadata: Metadata = { title: "Predračuni" };

/** Lista predračuna (PRD §5.5, Design §7): čipovi statusa (Otvoreni zadano) i pretraga. */
export default function PredracuniPage({ searchParams }: PageProps<"/predracuni">) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <h2 className="hidden font-naslov text-2xl leading-8 font-semibold text-espresso lg:block">Predračuni</h2>
      <Suspense fallback={<KosturListe />}>
        <Lista searchParams={searchParams} />
      </Suspense>

      <Link
        href="/predracuni/novi"
        aria-label="Novi predračun"
        className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 flex size-14 items-center justify-center rounded-full bg-narancasta text-espresso shadow-[0_4px_12px_rgb(49_18_18/0.25)] hover:bg-jantar lg:right-8 lg:bottom-8"
      >
        <Plus aria-hidden className="size-7" strokeWidth={2.5} />
      </Link>
    </div>
  );
}

async function Lista({ searchParams }: Pick<PageProps<"/predracuni">, "searchParams">) {
  const { s, q } = await searchParams;
  const status = filterIzParametra(s);
  const trazi = typeof q === "string" ? q.slice(0, 200) : "";
  const stranica = await dohvatiPredracune({ status, q: trazi });

  return (
    <ListaPredracuna
      filteri={FILTERI_STATUSA}
      zadani={ZADANI_FILTER}
      status={status}
      q={trazi}
      pocetno={stranica}
    />
  );
}
