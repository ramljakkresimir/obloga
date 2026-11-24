"use client";

import { useRef, useState } from "react";
import { Download, Share2 } from "lucide-react";
import type { PredracunPdf } from "@/lib/pdf";
import { Gumb } from "@/components/ui/Gumb";
import { useObavijest } from "@/components/ui/Obavijest";

type Radnja = "posalji" | "preuzmi";

/** @react-pdf (~0,5 MB) i dokument učitavaju se tek kad zatrebaju; import() je keširan. */
const ucitajModule = () => Promise.all([import("@react-pdf/renderer"), import("./PredracunPdf")]);

/** Preuzimanje datoteke (radi i na mobitelu). */
function preuzmi(datoteka: File) {
  const url = URL.createObjectURL(datoteka);
  const a = Object.assign(document.createElement("a"), { href: url, download: datoteka.name });
  document.body.append(a);
  a.click();
  a.remove();
  // Neki preglednici (iOS) čitaju blob tek nakon klika, pa URL ne otpuštamo odmah.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

const jeGreska = (e: unknown, ime: string) => e instanceof DOMException && e.name === ime;

/** Pošalji (izbornik dijeljenja: Viber, WhatsApp, mail…) i Preuzmi PDF (PRD §5.5). */
export function PdfGumbi({ model }: { model: PredracunPdf }) {
  const obavijest = useObavijest();
  const [radi, setRadi] = useState<Radnja | null>(null);
  // Zadnji napravljeni PDF: drugi dodir ga ne generira ponovo (i dijeli ga odmah, unutar korisnikove geste).
  const kes = useRef<{ kljuc: string; datoteka: File } | null>(null);

  async function napraviDatoteku(): Promise<File> {
    const kljuc = JSON.stringify(model);
    if (kes.current?.kljuc === kljuc) return kes.current.datoteka;
    const [{ pdf }, { PredracunPdf, registrirajFontove }] = await ucitajModule();
    const origin = window.location.origin;
    registrirajFontove(origin);
    const blob = await pdf(<PredracunPdf model={model} origin={origin} />).toBlob();
    const datoteka = new File([blob], model.imeDatoteke, { type: "application/pdf" });
    kes.current = { kljuc, datoteka };
    return datoteka;
  }

  async function izvrsi(radnja: Radnja) {
    setRadi(radnja);
    let datoteka: File;
    try {
      datoteka = await napraviDatoteku();
    } catch (e) {
      console.error(e);
      obavijest("PDF se ne može napraviti. Pokušaj ponovno.", "greska");
      return;
    } finally {
      setRadi(null);
    }

    if (radnja === "preuzmi") {
      preuzmi(datoteka);
      return;
    }

    const podaci: ShareData = { files: [datoteka], title: `Predračun ${model.broj}`, text: model.tekstPoruke };
    if (typeof navigator.canShare !== "function" || !navigator.canShare(podaci)) {
      preuzmi(datoteka);
      obavijest("Dijeljenje nije podržano na ovom uređaju – PDF je preuzet.");
      return;
    }
    try {
      await navigator.share(podaci);
    } catch (e) {
      if (jeGreska(e, "AbortError")) return; // korisnik je zatvorio izbornik
      if (jeGreska(e, "NotAllowedError")) {
        // iOS: dok se PDF radio, istekla je korisnikova gesta. PDF je u kešu, drugi dodir dijeli odmah.
        obavijest("PDF je spreman – dodirni Pošalji još jednom.");
        return;
      }
      console.error(e);
      obavijest("PDF se ne može poslati. Pokušaj Preuzmi PDF.", "greska");
    }
  }

  const preducitaj = () => void ucitajModule().catch(() => {});

  return (
    <div className="grid grid-cols-2 gap-2">
      <Gumb
        punaSirina
        className="min-h-14 text-lg"
        ucitavanje={radi === "posalji"}
        disabled={radi !== null}
        onPointerEnter={preducitaj}
        onPointerDown={preducitaj}
        onFocus={preducitaj}
        onClick={() => izvrsi("posalji")}
      >
        {radi !== "posalji" && <Share2 aria-hidden className="size-5" />}
        Pošalji
      </Gumb>
      <Gumb
        varijanta="sekundarni"
        punaSirina
        className="min-h-14"
        ucitavanje={radi === "preuzmi"}
        disabled={radi !== null}
        onPointerEnter={preducitaj}
        onPointerDown={preducitaj}
        onFocus={preducitaj}
        onClick={() => izvrsi("preuzmi")}
      >
        {radi !== "preuzmi" && <Download aria-hidden className="size-5" />}
        Preuzmi PDF
      </Gumb>
    </div>
  );
}
