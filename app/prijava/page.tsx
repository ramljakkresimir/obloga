import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { FormaPrijave } from "./FormaPrijave";
import type { RazlogOdjave } from "@/lib/sesija";

export const metadata: Metadata = {
  title: "Prijava",
};

export default function PrijavaPage(props: PageProps<"/prijava">) {
  return (
    <main className="flex flex-1 flex-col">
      <div className="traka-brenda" aria-hidden />
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-10">
        <Image
          src="/slike/logo/logoNoBackground.png"
          alt="obloga.ba"
          width={600}
          height={619}
          priority
          className="mx-auto h-auto w-32"
        />
        <h1 className="mt-8 mb-6 font-naslov text-2xl leading-8 font-semibold text-espresso">Prijava</h1>
        <Suspense fallback={<KosturForme />}>
          <FormaSParametrima searchParams={props.searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function FormaSParametrima({ searchParams }: { searchParams: PageProps<"/prijava">["searchParams"] }) {
  const params = await searchParams;
  const razlog = params.razlog === "neaktivnost" || params.razlog === "pristup" ? (params.razlog as RazlogOdjave) : undefined;
  const next = typeof params.next === "string" ? params.next : undefined;
  return <FormaPrijave razlog={razlog} next={next} />;
}

function KosturForme() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <div className="h-[74px] animate-pulse rounded-[var(--radius-polje)] bg-rub/60" />
      <div className="h-[74px] animate-pulse rounded-[var(--radius-polje)] bg-rub/60" />
      <div className="mt-2 h-14 animate-pulse rounded-[var(--radius-polje)] bg-rub/60" />
    </div>
  );
}
