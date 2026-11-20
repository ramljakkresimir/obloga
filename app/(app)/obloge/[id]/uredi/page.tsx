import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { dohvatiOblogu, idIzParametra, mozeSeObrisati } from "@/lib/data/obloge";
import { dohvatiKategorije } from "@/lib/data/postavke";
import { FormaObloge } from "@/components/obloge/FormaObloge";
import { KosturForme } from "@/components/obloge/KosturForme";

export const metadata: Metadata = { title: "Uredi oblogu" };

export default function UrediOblogaPage({ params }: PageProps<"/obloge/[id]/uredi">) {
  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={<KosturForme />}>
        <Forma params={params} />
      </Suspense>
    </div>
  );
}

async function Forma({ params }: Pick<PageProps<"/obloge/[id]/uredi">, "params">) {
  const id = idIzParametra((await params).id);
  const [obloga, kategorije, smijeBrisati] = await Promise.all([
    dohvatiOblogu(id),
    dohvatiKategorije(),
    mozeSeObrisati(id),
  ]);
  if (!obloga) notFound();

  return (
    <>
      <div className="mx-auto hidden w-full max-w-xl flex-col gap-2 lg:flex">
        <Link
          href={`/obloge/${obloga.id}`}
          className="inline-flex min-h-12 items-center gap-2 self-start font-semibold text-sivosmeda hover:text-espresso"
        >
          <ArrowLeft aria-hidden className="size-5" />
          {obloga.naziv}
        </Link>
        <h2 className="font-naslov text-2xl leading-8 font-semibold text-espresso">Uredi oblogu</h2>
      </div>
      {/* key: nakon spremanja forma kreće od svježih podataka */}
      <FormaObloge
        key={obloga.id}
        obloga={obloga}
        mozeSeObrisati={smijeBrisati}
        kategorije={kategorije.map(({ id, naziv }) => ({ id, naziv }))}
      />
    </>
  );
}
