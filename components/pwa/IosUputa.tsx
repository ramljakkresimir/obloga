"use client";

import { useSyncExternalStore } from "react";
import { Share, SquarePlus, X } from "lucide-react";

const KLJUC = "ios-uputa-zatvorena";
const DOGADAJ = "ios-uputa-promjena";

function jeIos() {
  const ua = navigator.userAgent;
  // iPadOS se predstavlja kao Mac, pa se prepoznaje po dodiru.
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function jeInstalirana() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function jeZatvorena() {
  try {
    return localStorage.getItem(KLJUC) === "1";
  } catch {
    return false;
  }
}

function prikazati() {
  return jeIos() && !jeInstalirana() && !jeZatvorena();
}

function pretplata(promjena: () => void) {
  window.addEventListener(DOGADAJ, promjena);
  window.addEventListener("storage", promjena);
  return () => {
    window.removeEventListener(DOGADAJ, promjena);
    window.removeEventListener("storage", promjena);
  };
}

function zatvori() {
  try {
    localStorage.setItem(KLJUC, "1");
  } catch {
    // Privatni način bez localStoragea: traka se zatvori samo do osvježavanja.
  }
  window.dispatchEvent(new Event(DOGADAJ));
}

/**
 * Traka s uputom „Dijeli → Dodaj na početni zaslon", samo na iPhoneu/iPadu
 * dok aplikacija nije instalirana. Zatvaranje se pamti na uređaju (localStorage);
 * upute ostaju dostupne u Postavkama.
 */
export function IosUputa() {
  const vidljiva = useSyncExternalStore(pretplata, prikazati, () => false);
  if (!vidljiva) return null;

  return (
    <div
      role="note"
      className="mb-4 flex items-start gap-3 rounded-[var(--radius-kartica)] border border-pijesak bg-pijesak-svijetli p-3 pl-4 text-sm text-espresso"
    >
      <p className="flex-1 py-1.5">
        <span className="font-semibold">Instalirajte aplikaciju:</span> dodirnite{" "}
        <Share aria-label="Dijeli" className="inline size-4 align-[-2px]" /> <span className="font-semibold">Dijeli</span>,
        zatim <SquarePlus aria-hidden className="inline size-4 align-[-2px]" />{" "}
        <span className="font-semibold">Dodaj na početni zaslon</span>.
      </p>
      <button
        type="button"
        onClick={zatvori}
        aria-label="Zatvori uputu"
        className="-my-1 -mr-1 flex size-10 shrink-0 items-center justify-center rounded-full text-sivosmeda hover:bg-pijesak/40 hover:text-espresso"
      >
        <X aria-hidden className="size-5" />
      </button>
    </div>
  );
}
