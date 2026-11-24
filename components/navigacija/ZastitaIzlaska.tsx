"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { DonjiList } from "@/components/ui/DonjiList";
import { Gumb } from "@/components/ui/Gumb";

type Kontekst = {
  /** Uključuje/isključuje zaštitu (ekran s nespremljenim unosom). */
  postavi: (aktivna: boolean) => void;
  /** Je li zaštita uključena. Ako jest, otvara potvrdu za odlazak na `href` i vraća true (navigaciju treba zaustaviti). */
  zadrzi: (href: string) => boolean;
};

const ZastitaKontekst = createContext<Kontekst | null>(null);

/**
 * Upozorenje „Izaći bez spremanja?" za linkove u navigaciji (Next.js `onNavigate`, docs: Link → Blocking navigation).
 * Ekran s unosom poziva useZastitaIzlaska(imaNespremljeno). Gumb Natrag preglednika se ne može pouzdano zaustaviti.
 */
export function ZastitaIzlaskaProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const aktivna = useRef(false);
  const [cilj, setCilj] = useState<string | null>(null);

  const postavi = useCallback((a: boolean) => {
    aktivna.current = a;
  }, []);

  const zadrzi = useCallback((href: string) => {
    if (!aktivna.current) return false;
    setCilj(href);
    return true;
  }, []);

  const vrijednost = useMemo(() => ({ postavi, zadrzi }), [postavi, zadrzi]);

  return (
    <ZastitaKontekst.Provider value={vrijednost}>
      {children}
      <DonjiList otvoren={cilj !== null} onZatvori={() => setCilj(null)} naslov="Izaći bez spremanja?">
        <div className="flex flex-col gap-4">
          <p>Unesene promjene nisu spremljene i bit će izgubljene.</p>
          <div className="flex flex-col gap-2">
            <Gumb
              varijanta="opasni"
              punaSirina
              onClick={() => {
                const href = cilj;
                aktivna.current = false;
                setCilj(null);
                if (href) router.push(href);
              }}
            >
              Izađi bez spremanja
            </Gumb>
            <Gumb varijanta="tekstualni" punaSirina onClick={() => setCilj(null)}>
              Ostani
            </Gumb>
          </div>
        </div>
      </DonjiList>
    </ZastitaKontekst.Provider>
  );
}

/**
 * Za linkove u navigaciji: `zadrzi(href)` vraća true i otvara potvrdu kad ekran ima nespremljen unos;
 * tada link zaustavlja navigaciju (`e.preventDefault()` u onNavigate/onClick). Bez providera uvijek false.
 */
export function useZadrziIzlazak() {
  const ctx = useContext(ZastitaKontekst);
  return useCallback((href: string) => ctx?.zadrzi(href) ?? false, [ctx]);
}

/** Za ekran s unosom: dok je `aktivna`, navigacija traži potvrdu, a zatvaranje kartice/osvježavanje upozorenje preglednika. */
export function useZastitaIzlaska(aktivna: boolean) {
  const ctx = useContext(ZastitaKontekst);

  useEffect(() => {
    ctx?.postavi(aktivna);
    if (!aktivna) return;
    function prijeOdlaska(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", prijeOdlaska);
    return () => {
      window.removeEventListener("beforeunload", prijeOdlaska);
      ctx?.postavi(false);
    };
  }, [ctx, aktivna]);
}
