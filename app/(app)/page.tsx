import { Suspense } from "react";
import Link from "next/link";
import { FileText, PackagePlus, Receipt, type LucideIcon } from "lucide-react";
import { dohvatiVlasnika } from "@/lib/auth";

export default function PocetnaPage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<KosturPozdrava />}>
        <Pozdrav />
      </Suspense>
      <BrzeAkcije />
      <p className="rounded-[var(--radius-kartica)] border border-rub bg-povrsina p-4 text-sivosmeda shadow-[var(--shadow-kartica)]">
        Pregled prodaje, otvorenih predračuna i niskog stanja dolazi uskoro.
      </p>
    </div>
  );
}

/** Tri brze akcije (Design §2). Predračun i brza prodaja su neaktivni dok ti ekrani ne budu gotovi. */
function BrzeAkcije() {
  return (
    <section aria-label="Brze akcije" className="grid grid-cols-3 gap-3">
      <NeaktivnaAkcija ikona={FileText} naziv="Novi predračun" primarna />
      <NeaktivnaAkcija ikona={Receipt} naziv="Brza prodaja" />
      <Link
        href="/obloge/ulaz"
        className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-[var(--radius-kartica)] border border-rub bg-povrsina p-3 text-center font-semibold text-espresso shadow-[var(--shadow-kartica)] transition-colors hover:bg-pijesak-svijetli"
      >
        <PackagePlus aria-hidden className="size-7" />
        <span className="leading-tight">Ulaz robe</span>
      </Link>
    </section>
  );
}

function NeaktivnaAkcija({ ikona: Ikona, naziv, primarna }: { ikona: LucideIcon; naziv: string; primarna?: boolean }) {
  return (
    <div
      aria-disabled="true"
      className={`flex min-h-24 cursor-not-allowed flex-col items-center justify-center gap-2 rounded-[var(--radius-kartica)] p-3 text-center font-semibold opacity-60 ${
        primarna ? "bg-espresso text-white" : "border border-rub bg-povrsina text-espresso"
      }`}
    >
      <Ikona aria-hidden className="size-7" />
      <span className="leading-tight">{naziv}</span>
      <span className="text-xs font-normal">uskoro</span>
    </div>
  );
}

function pozdravZaSat(sat: number) {
  if (sat < 10) return "Dobro jutro";
  if (sat < 18) return "Dobar dan";
  return "Dobra večer";
}

async function Pozdrav() {
  const vlasnik = await dohvatiVlasnika();
  const sada = new Date();
  const sat = Number(
    new Intl.DateTimeFormat("hr-HR", { hour: "numeric", hourCycle: "h23", timeZone: "Europe/Sarajevo" }).format(sada),
  );
  const datum = new Intl.DateTimeFormat("hr-HR", {
    weekday: "long",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: "Europe/Sarajevo",
  }).format(sada);

  return (
    <div>
      <h2 className="font-naslov text-2xl leading-8 font-semibold text-espresso">
        {pozdravZaSat(sat)}, {vlasnik.ime}
      </h2>
      <p className="text-sivosmeda">{datum}</p>
    </div>
  );
}

function KosturPozdrava() {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      <div className="h-8 w-56 animate-pulse rounded-lg bg-rub/60" />
      <div className="h-5 w-40 animate-pulse rounded-lg bg-rub/60" />
    </div>
  );
}
