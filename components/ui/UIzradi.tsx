import { Hammer } from "lucide-react";

/** Privremeni sadržaj za ekrane koji još nisu napravljeni. */
export function UIzradi({ naslov }: { naslov: string }) {
  return (
    <section className="flex flex-col items-center gap-4 overflow-hidden rounded-[var(--radius-kartica)] border border-rub bg-povrsina pb-8 text-center shadow-[var(--shadow-kartica)]">
      <div className="traka-brenda w-full" aria-hidden />
      <Hammer aria-hidden className="mt-4 size-8 text-drvo" />
      <h2 className="font-naslov text-lg font-semibold text-espresso">{naslov}</h2>
      <p className="px-4 text-sivosmeda">Ovaj dio aplikacije je u izradi.</p>
    </section>
  );
}
