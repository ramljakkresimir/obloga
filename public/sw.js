// Minimalni service worker (Tech.md §12).
// Kešira samo offline paket; podaci i stranice se NE keširaju – aplikacija radi online.
// Kod izmjene popisa datoteka povećati verziju kako bi se stari keš obrisao.

const CACHE = "obloga-offline-v1";
const OFFLINE_URL = "/offline.html";
const PAKET = [OFFLINE_URL, "/ikone/znak.png", "/ikone/ikona-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PAKET.map((url) => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((kljucevi) => Promise.all(kljucevi.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Navigacija (otvaranje stranice): uvijek mreža, a bez veze offline stranica.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) ?? Response.error())
    );
    return;
  }

  // Slike koje koristi offline stranica (iz keša ako mreže nema).
  const url = new URL(request.url);
  if (url.origin === self.location.origin && PAKET.includes(url.pathname)) {
    event.respondWith(fetch(request).catch(async () => (await caches.match(url.pathname)) ?? Response.error()));
  }
});
