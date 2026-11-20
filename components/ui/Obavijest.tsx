"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { KOLACIC_OBAVIJEST } from "@/lib/sesija";

type Vrsta = "uspjeh" | "greska";
type Prikazi = (tekst: string, vrsta?: Vrsta) => void;
type Stanje = { tekst: string; vrsta: Vrsta; kljuc: number };

const KontekstObavijesti = createContext<Prikazi | null>(null);

/** Prikaži kratku obavijest (toast): obavijest("Spremljeno") ili obavijest("…", "greska"). */
export function useObavijest(): Prikazi {
  const prikazi = useContext(KontekstObavijesti);
  if (!prikazi) throw new Error("useObavijest se koristi izvan <ObavijestProvider>.");
  return prikazi;
}

/** Pročitaj i obriši flash kolačić koji postavlja postaviObavijest() (lib/akcije.ts). */
function preuzmiFlash(): { tekst: string; vrsta: Vrsta } | null {
  const zapis = document.cookie.split("; ").find((c) => c.startsWith(`${KOLACIC_OBAVIJEST}=`));
  if (!zapis) return null;
  document.cookie = `${KOLACIC_OBAVIJEST}=; Max-Age=0; path=/`;
  try {
    const { tekst, vrsta } = JSON.parse(decodeURIComponent(zapis.slice(KOLACIC_OBAVIJEST.length + 1)));
    if (typeof tekst !== "string" || !tekst) return null;
    return { tekst, vrsta: vrsta === "greska" ? "greska" : "uspjeh" };
  } catch {
    return null;
  }
}

export function ObavijestProvider({ children }: { children: ReactNode }) {
  const [obavijest, setObavijest] = useState<Stanje | null>(null);
  const pathname = usePathname();

  const prikazi = useCallback<Prikazi>((tekst, vrsta = "uspjeh") => {
    setObavijest({ tekst, vrsta, kljuc: Date.now() });
  }, []);

  // Poruka iz Server Action koja je završila s redirect(): pokaži je na novoj stranici.
  // Kolačić se čita tek u callbacku: u StrictModeu se prvi timeout očisti prije nego ga potroši.
  useEffect(() => {
    const t = setTimeout(() => {
      const flash = preuzmiFlash();
      if (flash) prikazi(flash.tekst, flash.vrsta);
    }, 0);
    return () => clearTimeout(t);
  }, [pathname, prikazi]);

  useEffect(() => {
    if (!obavijest) return;
    const t = setTimeout(() => setObavijest(null), obavijest.vrsta === "greska" ? 6000 : 4000);
    return () => clearTimeout(t);
  }, [obavijest]);

  const Ikona = obavijest?.vrsta === "greska" ? CircleAlert : CircleCheck;

  return (
    <KontekstObavijesti.Provider value={prikazi}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-4 lg:inset-x-auto lg:right-8 lg:bottom-8"
      >
        {obavijest && (
          <div
            key={obavijest.kljuc}
            className={`pointer-events-auto flex w-full max-w-md items-start gap-2 rounded-[var(--radius-polje)] py-3 pr-2 pl-4 font-semibold text-white shadow-[0_4px_16px_rgb(49_18_18/0.25)] transition-[opacity,translate] duration-200 starting:translate-y-2 starting:opacity-0 ${
              obavijest.vrsta === "greska" ? "bg-greska" : "bg-espresso"
            }`}
          >
            <Ikona aria-hidden className={`mt-0.5 size-5 shrink-0 ${obavijest.vrsta === "greska" ? "" : "text-pijesak"}`} />
            <span className="flex-1">{obavijest.tekst}</span>
            <button
              type="button"
              onClick={() => setObavijest(null)}
              aria-label="Zatvori obavijest"
              className="-my-2 flex size-10 shrink-0 items-center justify-center rounded-full text-white/80 hover:text-white"
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>
        )}
      </div>
    </KontekstObavijesti.Provider>
  );
}
