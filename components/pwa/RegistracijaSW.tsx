"use client";

import { useEffect } from "react";

/**
 * Registrira service worker (public/sw.js) samo u produkcijskom buildu,
 * da ne smeta `next dev`. Nova verzija SW-a se aktivira sama (skipWaiting u sw.js).
 */
export function RegistracijaSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Bez SW-a aplikacija radi normalno, samo nema offline stranice.
    });
  }, []);

  return null;
}
