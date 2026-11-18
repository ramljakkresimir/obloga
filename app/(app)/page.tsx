import { Suspense } from "react";
import { dohvatiVlasnika } from "@/lib/auth";

export default function PocetnaPage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<KosturPozdrava />}>
        <Pozdrav />
      </Suspense>
      <p className="rounded-[var(--radius-kartica)] border border-rub bg-povrsina p-4 text-sivosmeda shadow-[var(--shadow-kartica)]">
        Pregled prodaje, otvorenih predračuna i niskog stanja dolazi uskoro.
      </p>
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
