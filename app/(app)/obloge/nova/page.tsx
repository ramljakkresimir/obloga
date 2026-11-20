import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { dohvatiKategorije } from "@/lib/data/postavke";
import { FormaObloge } from "@/components/obloge/FormaObloge";
import { KosturForme } from "@/components/obloge/KosturForme";

export const metadata: Metadata = { title: "Nova obloga" };

export default function NovaOblogaPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="mx-auto hidden w-full max-w-xl flex-col gap-2 lg:flex">
        <Link href="/obloge" className="inline-flex min-h-12 items-center gap-2 self-start font-semibold text-sivosmeda hover:text-espresso">
          <ArrowLeft aria-hidden className="size-5" />
          Obloge
        </Link>
        <h2 className="font-naslov text-2xl leading-8 font-semibold text-espresso">Nova obloga</h2>
      </div>
      <Suspense fallback={<KosturForme />}>
        <Forma />
      </Suspense>
    </div>
  );
}

async function Forma() {
  const kategorije = await dohvatiKategorije();
  return <FormaObloge kategorije={kategorije.map(({ id, naziv }) => ({ id, naziv }))} />;
}
