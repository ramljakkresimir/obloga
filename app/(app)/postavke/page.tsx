import type { Metadata } from "next";
import { Suspense } from "react";
import { LogOut } from "lucide-react";
import { odjava } from "@/app/prijava/actions";
import { dohvatiVlasnika } from "@/lib/auth";
import { Gumb } from "@/components/ui/Gumb";
import { Kartica } from "@/components/ui/Kartica";
import { PromjenaLozinke } from "./PromjenaLozinke";

export const metadata: Metadata = { title: "Postavke" };

export default function PostavkePage() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <h2 className="hidden font-naslov text-2xl leading-8 font-semibold text-espresso lg:block">Postavke</h2>

      <Kartica naslov="Lozinka">
        <PromjenaLozinke />
      </Kartica>

      <Kartica naslov="Nalog">
        <Suspense fallback={<div className="h-6 w-60 animate-pulse rounded-lg bg-rub/60" aria-hidden />}>
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

async function PrijavljenKao() {
  const vlasnik = await dohvatiVlasnika();
  return (
    <p className="text-sm text-sivosmeda">
      Prijavljen kao <span className="font-semibold text-tekst">{vlasnik.ime}</span>
      {vlasnik.email && <> ({vlasnik.email})</>}
    </p>
  );
}
