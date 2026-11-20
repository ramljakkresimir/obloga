"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient as createStatelessClient } from "@supabase/supabase-js";
import { z } from "zod";
import { dohvatiVlasnika } from "@/lib/auth";
import { greskeIzZoda, zBroj, type StanjeForme } from "@/lib/akcije";
import { brojSImenicom, OBLIK_OBLOGA } from "@/lib/format";
import { createClient } from "@/utils/supabase/server";
import type { TablesUpdate } from "@/utils/supabase/types";

/* ---------------------------------------------------------------------------
 * Podaci firme, PDV i ljepilo – jedna forma, jedan gumb „Spremi".
 * ------------------------------------------------------------------------- */

type PoljePostavki =
  | "naziv_firme"
  | "adresa"
  | "mjesto"
  | "telefon"
  | "email"
  | "jib"
  | "pdv_broj"
  | "pdv_stopa"
  | "ljepilo_cijena";

export type StanjePostavki = StanjeForme<PoljePostavki>;

/** Neobavezan tekst: obrezan, prazno → null. */
function neobavezno(max: number) {
  return z
    .string()
    .trim()
    .max(max, `Najviše ${max} znakova.`)
    .transform((t) => (t === "" ? null : t));
}

/** Broj s najviše dvije decimale (numeric(…,2) u bazi), u rasponu [od, do]. */
function iznos(od: number, doVrijednosti: number, poruka: string) {
  return zBroj
    .refine((n) => n >= od && n <= doVrijednosti, poruka)
    .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, "Najviše dvije decimale.")
    .transform((n) => Math.round(n * 100) / 100);
}

const shemaOsnovno = z.object({
  naziv_firme: z.string().trim().min(1, "Upišite naziv firme.").max(120, "Najviše 120 znakova."),
  adresa: neobavezno(200),
  mjesto: neobavezno(100),
  telefon: neobavezno(50),
  email: neobavezno(254).refine((t) => t === null || z.email().safeParse(t).success, "Upišite ispravan email."),
  jib: z
    .string()
    .transform((t) => t.replace(/\s/g, ""))
    .refine((t) => t === "" || /^\d{13}$/.test(t), "JIB ima točno 13 znamenki.")
    .transform((t) => (t === "" ? null : t)),
  ljepilo_cijena: iznos(0, 99_999_999.99, "Cijena ne može biti negativna."),
});

/** Provjerava se i upisuje samo kad je firma u sustavu PDV-a; inače stare vrijednosti ostaju. */
const shemaPdv = z.object({
  pdv_broj: neobavezno(50),
  pdv_stopa: iznos(0, 100, "Stopa mora biti između 0 i 100 %."),
});

function tekst(formData: FormData, polje: string): string {
  const v = formData.get(polje);
  return typeof v === "string" ? v : "";
}

export async function spremiPostavke(_prethodno: StanjePostavki, formData: FormData): Promise<StanjePostavki> {
  await dohvatiVlasnika();

  const uSustavuPdv = formData.get("u_sustavu_pdv") === "on";
  const osnovno = shemaOsnovno.safeParse({
    naziv_firme: tekst(formData, "naziv_firme"),
    adresa: tekst(formData, "adresa"),
    mjesto: tekst(formData, "mjesto"),
    telefon: tekst(formData, "telefon"),
    email: tekst(formData, "email"),
    jib: tekst(formData, "jib"),
    ljepilo_cijena: tekst(formData, "ljepilo_cijena"),
  });
  const pdv = uSustavuPdv
    ? shemaPdv.safeParse({ pdv_broj: tekst(formData, "pdv_broj"), pdv_stopa: tekst(formData, "pdv_stopa") })
    : null;

  if (!osnovno.success || (pdv && !pdv.success)) {
    const greske = {
      ...(osnovno.success ? {} : greskeIzZoda<PoljePostavki>(osnovno.error).greske),
      ...(pdv && !pdv.success ? greskeIzZoda<PoljePostavki>(pdv.error).greske : {}),
    };
    return { greske };
  }

  const promjena: TablesUpdate<"postavke"> = { ...osnovno.data, u_sustavu_pdv: uSustavuPdv };
  if (pdv?.success) {
    Object.assign(promjena, pdv.data, { cijene_sa_pdv: formData.get("cijene_sa_pdv") === "on" });
  }

  const supabase = createClient(await cookies());
  const { data, error } = await supabase.from("postavke").update(promjena).eq("id", 1).select("id");
  if (error) return { greska: "Postavke nisu spremljene. Pokušajte ponovno." };
  if (data.length === 0) return { greska: "Postavke ne postoje u bazi. Javite se administratoru." };

  revalidatePath("/postavke");
  return { uspjeh: "Postavke su spremljene." };
}

/* ---------------------------------------------------------------------------
 * Kategorije – spremaju se odmah, svaka radnja zasebno.
 * ------------------------------------------------------------------------- */

export type StanjeKategorije = StanjeForme<"naziv">;

const nazivKategorije = z
  .string()
  .trim()
  .min(1, "Upišite naziv kategorije.")
  .max(60, "Naziv je predug (najviše 60 znakova).");
const idKategorije = z.coerce.number().int().positive();

const POSTOJI_NAZIV = "Kategorija s tim nazivom već postoji.";

/** Kategorije se vide u Postavkama i kao čipovi na Oblogama. */
function osvjeziKategorije() {
  revalidatePath("/postavke");
  revalidatePath("/obloge");
}

export async function dodajKategoriju(_prethodno: StanjeKategorije, formData: FormData): Promise<StanjeKategorije> {
  await dohvatiVlasnika();

  const rezultat = z.object({ naziv: nazivKategorije }).safeParse({ naziv: tekst(formData, "naziv") });
  if (!rezultat.success) return greskeIzZoda(rezultat.error);

  const supabase = createClient(await cookies());
  const { data: zadnja, error: greskaZadnje } = await supabase
    .from("kategorije")
    .select("redoslijed")
    .order("redoslijed", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (greskaZadnje) return { greska: "Kategorija nije dodana. Pokušajte ponovno." };

  const { error } = await supabase
    .from("kategorije")
    .insert({ naziv: rezultat.data.naziv, redoslijed: (zadnja?.redoslijed ?? 0) + 1 });
  if (error?.code === "23505") return { greske: { naziv: POSTOJI_NAZIV } };
  if (error) return { greska: "Kategorija nije dodana. Pokušajte ponovno." };

  osvjeziKategorije();
  return { uspjeh: "Kategorija je dodana." };
}

export async function preimenujKategoriju(_prethodno: StanjeKategorije, formData: FormData): Promise<StanjeKategorije> {
  await dohvatiVlasnika();

  const rezultat = z
    .object({ id: idKategorije, naziv: nazivKategorije })
    .safeParse({ id: formData.get("id"), naziv: tekst(formData, "naziv") });
  if (!rezultat.success) return greskeIzZoda(rezultat.error);

  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from("kategorije")
    .update({ naziv: rezultat.data.naziv })
    .eq("id", rezultat.data.id)
    .select("id");
  if (error?.code === "23505") return { greske: { naziv: POSTOJI_NAZIV } };
  if (error) return { greska: "Izmjena nije spremljena. Pokušajte ponovno." };
  if (data.length === 0) return { greska: "Kategorija više ne postoji." };

  osvjeziKategorije();
  return { uspjeh: "Kategorija je preimenovana." };
}

/** Pomak za jedno mjesto gore (-1) ili dolje (1). Redoslijed se normalizira na 1..n. */
export async function pomakniKategoriju(kategorijaId: number, smjer: -1 | 1): Promise<StanjeForme> {
  await dohvatiVlasnika();

  const rezultat = z
    .object({ id: idKategorije, smjer: z.union([z.literal(-1), z.literal(1)]) })
    .safeParse({ id: kategorijaId, smjer });
  if (!rezultat.success) return { greska: "Neispravan zahtjev." };

  const supabase = createClient(await cookies());
  const { data: lista, error } = await supabase
    .from("kategorije")
    .select("id, redoslijed")
    .order("redoslijed")
    .order("id");
  if (error) return { greska: "Redoslijed nije promijenjen. Pokušajte ponovno." };

  const i = lista.findIndex((k) => k.id === rezultat.data.id);
  const j = i + rezultat.data.smjer;
  if (i === -1) return { greska: "Kategorija više ne postoji." };
  if (j < 0 || j >= lista.length) return {};

  [lista[i], lista[j]] = [lista[j], lista[i]];
  const izmjene = lista
    .map((k, indeks) => ({ id: k.id, stari: k.redoslijed, novi: indeks + 1 }))
    .filter((k) => k.stari !== k.novi);

  const odgovori = await Promise.all(
    izmjene.map((k) => supabase.from("kategorije").update({ redoslijed: k.novi }).eq("id", k.id)),
  );
  osvjeziKategorije();
  if (odgovori.some((o) => o.error)) return { greska: "Redoslijed nije promijenjen. Pokušajte ponovno." };
  return {};
}

export async function obrisiKategoriju(kategorijaId: number): Promise<StanjeForme> {
  await dohvatiVlasnika();

  const rezultat = idKategorije.safeParse(kategorijaId);
  if (!rezultat.success) return { greska: "Neispravan zahtjev." };

  const supabase = createClient(await cookies());
  const { data, error } = await supabase.from("kategorije").delete().eq("id", rezultat.data).select("id");

  if (error?.code === "23503") {
    const { count } = await supabase
      .from("artikli")
      .select("id", { count: "exact", head: true })
      .eq("kategorija_id", rezultat.data);
    const broj = count ? ` (${brojSImenicom(count, OBLIK_OBLOGA)})` : "";
    return { greska: `Kategorija nije prazna${broj}. Prvo premjestite ili obrišite obloge.` };
  }
  if (error) return { greska: "Kategorija nije obrisana. Pokušajte ponovno." };
  if (data.length === 0) return { greska: "Kategorija više ne postoji." };

  osvjeziKategorije();
  return { uspjeh: "Kategorija je obrisana." };
}

/* ---------------------------------------------------------------------------
 * Lozinka
 * ------------------------------------------------------------------------- */

export type StanjeLozinke = {
  greska?: string;
  greske?: Partial<Record<"trenutna" | "nova" | "ponovi", string>>;
  uspjeh?: string;
} | undefined;

const shemaLozinke = z
  .object({
    trenutna: z.string().min(1, "Upišite trenutnu lozinku."),
    nova: z.string().min(8, "Nova lozinka mora imati barem 8 znakova.").max(72, "Nova lozinka je preduga."),
    ponovi: z.string(),
  })
  .refine((d) => d.nova === d.ponovi, { path: ["ponovi"], message: "Lozinke se ne podudaraju." })
  .refine((d) => d.nova !== d.trenutna, { path: ["nova"], message: "Nova lozinka mora biti različita od trenutne." });

export async function promijeniLozinku(_prethodno: StanjeLozinke, formData: FormData): Promise<StanjeLozinke> {
  const vlasnik = await dohvatiVlasnika();

  const rezultat = shemaLozinke.safeParse({
    trenutna: formData.get("trenutna") ?? "",
    nova: formData.get("nova") ?? "",
    ponovi: formData.get("ponovi") ?? "",
  });
  if (!rezultat.success) {
    const greske: NonNullable<StanjeLozinke>["greske"] = {};
    for (const issue of rezultat.error.issues) {
      const polje = issue.path[0] as "trenutna" | "nova" | "ponovi";
      greske[polje] ??= issue.message;
    }
    return { greske };
  }
  const { trenutna, nova } = rezultat.data;

  // Provjera trenutne lozinke na zasebnom klijentu bez kolačića, da se ne dira sesija ovog uređaja.
  const provjera = createStatelessClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
  const { error: greskaProvjere } = await provjera.auth.signInWithPassword({ email: vlasnik.email, password: trenutna });
  if (greskaProvjere) {
    if (greskaProvjere.status === 429) {
      return { greska: "Previše pokušaja. Pokušajte ponovno za nekoliko minuta." };
    }
    return { greske: { trenutna: "Trenutna lozinka nije ispravna." } };
  }
  // Ukloni privremenu sesiju nastalu provjerom.
  await provjera.auth.signOut({ scope: "local" });

  const supabase = createClient(await cookies());
  const { error } = await supabase.auth.updateUser({ password: nova });
  if (error) {
    if (error.code === "weak_password") {
      return { greske: { nova: "Lozinka je preslaba. Odaberite dužu ili složeniju lozinku." } };
    }
    if (error.code === "same_password") {
      return { greske: { nova: "Nova lozinka mora biti različita od trenutne." } };
    }
    return { greska: "Lozinka nije promijenjena. Pokušajte ponovno." };
  }

  return { uspjeh: "Lozinka je promijenjena." };
}
