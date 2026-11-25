import type { MetadataRoute } from "next";

/** PWA manifest (Tech.md §12). Ikone se generiraju iz loga, u public/ikone/. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Obloga.ba – Poslovanje",
    short_name: "Obloga",
    description: "Stanje obloga, predračuni, prodaja i bilješke za Obloga.ba",
    lang: "hr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FBF8F4",
    theme_color: "#311212",
    icons: [
      { src: "/ikone/ikona-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/ikone/ikona-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/ikone/ikona-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
