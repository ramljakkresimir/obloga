"use client";

import { useOptimistic, useTransition } from "react";
import { promijeniObavljeno } from "@/app/(app)/biljeske/actions";
import type { Biljeska } from "@/lib/data/biljeske";
import { formatDatumKratko } from "@/lib/format";
import { useObavijest } from "@/components/ui/Obavijest";

/**
 * Otvorene bilješke na Početnoj (Design §2): samo kvačica, bez izbornika.
 * Označena bilješka odmah nestaje; sljedeća stiže revalidacijom "/" iz akcije.
 */
export function OtvoreneBiljeske({ biljeske }: { biljeske: Biljeska[] }) {
  const obavijest = useObavijest();
  const [, startTransition] = useTransition();
  const [prikaz, ukloniOptimisticno] = useOptimistic(biljeske, (stanje, id: number) =>
    stanje.filter((b) => b.id !== id),
  );

  function oznaci(b: Biljeska) {
    startTransition(async () => {
      ukloniOptimisticno(b.id);
      const rezultat = await promijeniObavljeno(b.id, true);
      if (rezultat?.greska) obavijest(rezultat.greska, "greska");
      else if (rezultat?.uspjeh) obavijest(rezultat.uspjeh);
    });
  }

  if (prikaz.length === 0) {
    return <p className="text-sivosmeda">Nema otvorenih bilješki.</p>;
  }

  return (
    <ul className="-mx-3 -my-2 divide-y divide-rub">
      {prikaz.map((b) => (
        <li key={b.id} className="flex items-start gap-1">
          <button
            type="button"
            role="checkbox"
            aria-checked={false}
            aria-label={`Obavljeno: ${b.tekst.slice(0, 60)}`}
            onClick={() => oznaci(b)}
            className="flex size-12 shrink-0 items-center justify-center rounded-full"
          >
            <span className="flex size-6 items-center justify-center rounded-full border-2 border-sivosmeda transition-colors" />
          </button>
          <div className="min-w-0 flex-1 py-3 pr-2">
            <p className="line-clamp-3 break-words whitespace-pre-line text-tekst">{b.tekst}</p>
            <p className="mt-1 text-sm text-sivosmeda tabular-nums">{formatDatumKratko(b.created_at)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
