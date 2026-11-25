import type { Metadata } from "next";
import { Suspense } from "react";
import { LogOut } from "lucide-react";
import { odjava } from "@/app/prijava/actions";
import { dohvatiVlasnika } from "@/lib/auth";
import { dohvatiKategorije, dohvatiPostavke } from "@/lib/data/postavke";
import { InstalacijaAplikacije } from "@/components/postavke/InstalacijaAplikacije";
import { Kategorije } from "@/components/postavke/Kategorije";
import { Gumb } from "@/components/ui/Gumb";
import { Kartica } from "@/components/ui/Kartica";
import { Skeleton } from "@/components/ui/Skeleton";
import { FormaPostavki } from "./FormaPostavki";
import { PromjenaLozinke } from "./PromjenaLozinke";

export const metadata: Metadata = { title: "Postavke" };

export default function PostavkePage() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <h2 className="hidden font-naslov text-2xl leading-8 font-semibold text-espresso lg:block">Postavke</h2>

      <Suspense fallback={<KosturForme />}>
        <PodaciPostavki />
      </Suspense>

      <Suspense fallback={<KosturKartice redaka={4} />}>
        <PopisKategorija />
      </Suspense>

      <InstalacijaAplikacije />

      <Kartica naslov="Lozinka">
        <PromjenaLozinke />
      </Kartica>

      <Kartica naslov="Nalog">
        <Suspense fallback={<Skeleton className="h-6 w-60" />}>
          <PrijavljenKao />
        </Suspense>
        <form action={odjava} className="mt-3">
          <Gumb type="submit" varijanta="opasni-tekstualni" className="-ml-3">
            <LogOut aria-hidden className="size-5" />
            Odjava
          </Gumb>
        </form>
      </Kartica>
    </div>
  );
}

async function PodaciPostavki() {
  const postavke = await dohvatiPostavke();
  return <FormaPostavki postavke={postavke} />;
}

async function PopisKategorija() {
  const kategorije = await dohvatiKategorije();
  return <Kategorije kategorije={kategorije} />;
}

async function PrijavljenKao() {
  const vlasnik = await dohvatiVlasnika();
  return (
    <p className="text-sm text-sivosmeda">
      Prijavljen kao <span className="font-semibold text-tekst">{vlasnik.ime}</span>
      {vlasnik.email && <> ({vlasnik.email})</>}
    </p>
  );
}

function KosturKartice({ redaka }: { redaka: number }) {
  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-kartica)] border border-rub bg-povrsina p-4">
      <Skeleton className="h-6 w-32" />
      {Array.from({ length: redaka }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

function KosturForme() {
  return (
    <div className="flex flex-col gap-4">
      <KosturKartice redaka={6} />
      <KosturKartice redaka={1} />
      <KosturKartice redaka={1} />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
