import { Kartica } from "@/components/ui/Kartica";

/** Kratke upute za instalaciju aplikacije na početni zaslon (PRD §5, Tech.md §12). */
export function InstalacijaAplikacije() {
  return (
    <Kartica naslov="Instalacija aplikacije">
      <div className="flex flex-col gap-4 text-sm">
        <section>
          <h4 className="font-semibold text-espresso">iPhone (Safari)</h4>
          <ol className="mt-1 list-decimal pl-5 text-sivosmeda">
            <li>Otvorite aplikaciju u Safariju.</li>
            <li>
              Dodirnite <span className="font-semibold text-tekst">Dijeli</span> (kvadrat sa strelicom prema gore).
            </li>
            <li>
              Odaberite <span className="font-semibold text-tekst">Dodaj na početni zaslon</span>, zatim{" "}
              <span className="font-semibold text-tekst">Dodaj</span>.
            </li>
          </ol>
        </section>
        <section>
          <h4 className="font-semibold text-espresso">Android (Chrome)</h4>
          <ol className="mt-1 list-decimal pl-5 text-sivosmeda">
            <li>Otvorite aplikaciju u Chromeu.</li>
            <li>
              Dodirnite izbornik <span className="font-semibold text-tekst">⋮</span> gore desno.
            </li>
            <li>
              Odaberite <span className="font-semibold text-tekst">Instaliraj aplikaciju</span> (ili{" "}
              <span className="font-semibold text-tekst">Dodaj na početni zaslon</span>).
            </li>
          </ol>
        </section>
        <p className="text-sivosmeda">Ikona obloga.ba pojavit će se na početnom zaslonu i otvarati aplikaciju preko cijelog ekrana.</p>
      </div>
    </Kartica>
  );
}
