import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "./types";
import { KOLACIC_AKTIVNOST, opcijeKolacicaAktivnosti } from "@/lib/sesija";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Rute dostupne bez prijave. */
const JAVNE_RUTE = ["/prijava", "/odjava", "/api/odrzavanje", "/manifest.webmanifest", "/sw.js", "/offline.html"];
const JAVNI_PREFIKSI = ["/ikone/", "/fonts/", "/slike/"];

function jeJavna(pathname: string) {
  return (
    JAVNE_RUTE.some((r) => pathname === r || pathname.startsWith(`${r}/`)) ||
    JAVNI_PREFIKSI.some((p) => pathname.startsWith(p))
  );
}

export const updateSession = async (request: NextRequest) => {
  // Create an unmodified response
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient<Database>(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Do not run code between createServerClient and getClaims().
  // This call validates the auth token and refreshes the session cookies if needed.
  const { data } = await supabase.auth.getClaims();
  const prijavljen = Boolean(data?.claims);

  const { pathname, search } = request.nextUrl;
  const aktivan = request.cookies.has(KOLACIC_AKTIVNOST);

  /** Redirect koji zadržava kolačiće koje je Supabase upravo postavio (osvježeni ili obrisani tokeni). */
  const preusmjeri = (putanja: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = putanja;
    url.search = "";
    for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v);
    const odgovor = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((c) => odgovor.cookies.set(c));
    return odgovor;
  };

  // Prijavljen vlasnik koji otvori /prijava ide na Početnu.
  if (pathname === "/prijava" && prijavljen && aktivan) {
    return preusmjeri("/");
  }

  if (jeJavna(pathname)) {
    return supabaseResponse;
  }

  if (!prijavljen) {
    const next = pathname + search;
    return preusmjeri("/prijava", next === "/" ? undefined : { next });
  }

  // Sesija postoji, ali aplikacija nije otvorena 7 dana na ovom uređaju → odjava.
  if (!aktivan) {
    await supabase.auth.signOut({ scope: "local" });
    return preusmjeri("/prijava", { razlog: "neaktivnost" });
  }

  // Klizni rok: svako otvaranje produžuje aktivnost za 7 dana.
  supabaseResponse.cookies.set(KOLACIC_AKTIVNOST, String(Date.now()), opcijeKolacicaAktivnosti);
  return supabaseResponse;
};
