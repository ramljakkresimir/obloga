"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { dohvatiVlasnika } from "@/lib/auth";
import { greskeIzZoda, postaviObavijest, type StanjeForme } from "@/lib/akcije";
import { dohvatiKretanja, type StranicaKretanja } from "@/lib/data/obloge";
import { brojSImenicom, formatBroj, OBLIK_OBLOGA, parseBroj } from "@/lib/format";
import { BUCKET_SLIKA, jePutanjaSlikeObloge, jeStorageSlika } from "@/lib/slike";
import { createClient } from "@/utils/supabase/server";
import type { TablesInsert } from "@/utils/supabase/types";

const POSTOJI_NAZIV = "Aktivna obloga s tim nazivom već postoji.";

const id = z.coerce.number().int().positive();

/** Obloge se vide na listi, detaljima i Početnoj (nisko stanje). */
function osvjezi(oblogaId?: number) {
  revalidatePath("/obloge");
  if (oblogaId) revalidatePath(`/obloge/${oblogaId}`);
  revalidatePath("/");
}

function tekst(formData: FormData, polje: string): string {
  const v = formData.get(polje);
  return typeof v === "string" ? v : "";
}

function decimale(n: number, najvise: number) {
  const f = 10 ** najvise;
  return Math.abs(n * f - Math.round(n * f)) < 1e-6;
}

/** Broj iz polja; prazno → null. Neispravno → greška. */
function opcionalniBroj(poruka: string, provjera: (n: number) => boolean, najviseDecimala: number) {
  return z.string().transform((t, ctx) => {
    if (t.trim() === "") return null;
    const n = parseBroj(t);
    if (n === null) {
      ctx.addIssue({ code: "custom", message: "Upišite ispravan broj." });
      return z.NEVER;
    }
    if (!provjera(n)) {
      ctx.addIssue({ code: "custom", message: poruka });
      return z.NEVER;
    }
    if (!decimale(n, najviseDecimala)) {
      ctx.addIssue({ code: "custom", message: `Najviše ${najviseDecimala} decimale.` });
      return z.NEVER;
    }
    return Math.round(n * 10 ** najviseDecimala) / 10 ** najviseDecimala;
  });
}

/** Cijeli broj komada; prazno → 0. */
function komadi(poruka: string, najvise = 1_000_000) {
  return z.string().transform((t, ctx) => {
    if (t.trim() === "") return 0;
    const n = parseBroj(t);
    if (n === null || !Number.isInteger(n)) {
      ctx.addIssue({ code: "custom", message: "Upišite cijeli broj komada." });
      return z.NEVER;
    }
    if (n < 0 || n > najvise) {
      ctx.addIssue({ code: "custom", message: poruka });
      return z.NEVER;
    }
    return n;
  });
}

/* ---------------------------------------------------------------------------
 * Nova obloga / uredi
 * ------------------------------------------------------------------------- */

type PoljeObloge =
  | "naziv"
  | "kategorija_id"
  | "sirina_cm"
  | "duzina_cm"
  | "m2_po_komadu"
  | "cijena_kom"
  | "min_stanje"
  | "pocetno_stanje";

/** Uz uobičajeno stanje forme vraća id spremljene obloge (klijent zatim uploada sliku). */
export type StanjeObloge = (NonNullable<StanjeForme<PoljeObloge>> & { id?: number }) | undefined;

const shemaObloge = z.object({
  naziv: z.string().trim().min(1, "Upišite naziv obloge.").max(120, "Naziv je predug (najviše 120 znakova)."),
  kategorija_id: z.coerce.number({ error: "Odaberite kategoriju." }).int().positive("Odaberite kategoriju."),
  sirina_cm: opcionalniBroj("Širina mora biti veća od 0.", (n) => n > 0 && n < 1_000_000, 2),
  duzina_cm: opcionalniBroj("Dužina mora biti veća od 0.", (n) => n > 0 && n < 1_000_000, 2),
  m2_po_komadu: opcionalniBroj("m² po komadu mora biti veći od 0.", (n) => n > 0 && n < 1_000_000, 4),
  cijena_kom: opcionalniBroj("Cijena ne može biti negativna.", (n) => n >= 0 && n < 100_000_000, 2).refine(
    (n) => n !== null,
    "Upišite cijenu po komadu.",
  ),
  min_stanje: komadi("Minimalno stanje mora biti između 0 i 1.000.000."),
  pocetno_stanje: komadi("Početno stanje mora biti između 0 i 1.000.000."),
});

export async function spremiOblogu(_prethodno: StanjeObloge, formData: FormData): Promise<StanjeObloge> {
  await dohvatiVlasnika();

  const postojeci = tekst(formData, "id") ? id.safeParse(tekst(formData, "id")) : null;
  if (postojeci && !postojeci.success) return { greska: "Neispravan zahtjev." };

  const rezultat = shemaObloge.safeParse({
    naziv: tekst(formData, "naziv"),
    kategorija_id: tekst(formData, "kategorija_id"),
    sirina_cm: tekst(formData, "sirina_cm"),
    duzina_cm: tekst(formData, "duzina_cm"),
    m2_po_komadu: tekst(formData, "m2_po_komadu"),
    cijena_kom: tekst(formData, "cijena_kom"),
    min_stanje: tekst(formData, "min_stanje"),
    pocetno_stanje: postojeci ? "" : tekst(formData, "pocetno_stanje"),
  });
  if (!rezultat.success) return greskeIzZoda<PoljeObloge>(rezultat.error);

  const { pocetno_stanje, cijena_kom, ...ostalo } = rezultat.data;
  const podaci = { ...ostalo, cijena_kom: cijena_kom ?? 0 } satisfies Omit<TablesInsert<"artikli">, "stanje">;
  const supabase = createClient(await cookies());

  if (postojeci) {
    const oblogaId = postojeci.data;
    const { data, error } = await supabase.from("artikli").update(podaci).eq("id", oblogaId).select("id");
    if (error?.code === "23505") return { greske: { naziv: POSTOJI_NAZIV } };
    if (error?.code === "23503") return { greske: { kategorija_id: "Odaberite kategoriju." } };
    if (error) return { greska: "Obloga nije spremljena. Pokušajte ponovno." };
    if (data.length === 0) return { greska: "Obloga više ne postoji." };

    osvjezi(oblogaId);
    return { id: oblogaId, uspjeh: "Obloga je spremljena." };
  }

  const { data, error } = await supabase.from("artikli").insert(podaci).select("id").single();
  if (error?.code === "23505") return { greske: { naziv: POSTOJI_NAZIV } };
  if (error?.code === "23503") return { greske: { kategorija_id: "Odaberite kategoriju." } };
  if (error) return { greska: "Obloga nije spremljena. Pokušajte ponovno." };

  const oblogaId = data.id;
  if (pocetno_stanje > 0) {
    const ulaz = await supabase.rpc("ulaz_robe", {
      p_stavke: [{ artikl_id: oblogaId, kolicina: pocetno_stanje }],
      p_napomena: "Početno stanje",
    });
    if (ulaz.error) {
      osvjezi(oblogaId);
      return {
        id: oblogaId,
        greska: "Obloga je dodana, ali početno stanje nije upisano. Dodajte ga gumbom „Dodaj na stanje”.",
      };
    }
  }

  osvjezi(oblogaId);
  return { id: oblogaId, uspjeh: "Obloga je dodana." };
}

/**
 * Nakon uploada iz preglednika: upiši putanju nove slike i obriši staru iz Storagea.
 * Statične slike iz public/ se ne brišu.
 */
export async function postaviSliku(oblogaId: number, putanja: string): Promise<StanjeForme> {
  await dohvatiVlasnika();

  const rezultat = z
    .object({ id, putanja: z.string() })
    .refine((v) => jePutanjaSlikeObloge(v.putanja, v.id))
    .safeParse({ id: oblogaId, putanja });
  if (!rezultat.success) return { greska: "Neispravna putanja slike." };

  const supabase = createClient(await cookies());
  const { data: stara, error: greskaCitanja } = await supabase
    .from("artikli")
    .select("slika")
    .eq("id", rezultat.data.id)
    .maybeSingle();
  if (greskaCitanja) return { greska: "Slika nije spremljena. Pokušajte ponovno." };
  if (!stara) return { greska: "Obloga više ne postoji." };

  const { error } = await supabase.from("artikli").update({ slika: rezultat.data.putanja }).eq("id", rezultat.data.id);
  if (error) {
    await supabase.storage.from(BUCKET_SLIKA).remove([rezultat.data.putanja]);
    return { greska: "Slika nije spremljena. Pokušajte ponovno." };
  }

  if (jeStorageSlika(stara.slika) && stara.slika !== rezultat.data.putanja) {
    // Ako brisanje ne uspije, ostaje samo neiskorištena datoteka; obloga je ispravna.
    await supabase.storage.from(BUCKET_SLIKA).remove([stara.slika]);
  }

  osvjezi(rezultat.data.id);
  return { uspjeh: "Slika je spremljena." };
}

/* ---------------------------------------------------------------------------
 * Arhiviranje
 * ------------------------------------------------------------------------- */

/** Arhivirana obloga nestaje iz liste i odabira; povijest i stari predračuni ostaju. */
export async function arhivirajOblogu(oblogaId: number): Promise<StanjeForme> {
  await dohvatiVlasnika();

  const rezultat = id.safeParse(oblogaId);
  if (!rezultat.success) return { greska: "Neispravan zahtjev." };

  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from("artikli")
    .update({ aktivan: false })
    .eq("id", rezultat.data)
    .select("id");
  if (error) return { greska: "Obloga nije arhivirana. Pokušajte ponovno." };
  if (data.length === 0) return { greska: "Obloga više ne postoji." };

  osvjezi(rezultat.data);
  await postaviObavijest("Obloga je arhivirana.");
  redirect("/obloge");
}

export async function vratiOblogu(oblogaId: number): Promise<StanjeForme> {
  await dohvatiVlasnika();

  const rezultat = id.safeParse(oblogaId);
  if (!rezultat.success) return { greska: "Neispravan zahtjev." };

  const supabase = createClient(await cookies());
  const { data, error } = await supabase.from("artikli").update({ aktivan: true }).eq("id", rezultat.data).select("id");
  if (error?.code === "23505") {
    return { greska: `${POSTOJI_NAZIV} Preimenujte jednu od njih pa pokušajte ponovno.` };
  }
  if (error) return { greska: "Obloga nije vraćena. Pokušajte ponovno." };
  if (data.length === 0) return { greska: "Obloga više ne postoji." };

  osvjezi(rezultat.data);
  return { uspjeh: "Obloga je vraćena iz arhive." };
}

/**
 * Trajno brisanje obloge koja nikad nije prodana (pravilo provjerava RPC obrisi_oblogu).
 * Brišu se i njeni ulazi/poništenja te sve datoteke u Storage mapi artikli/{id}/.
 */
export async function obrisiOblogu(oblogaId: number): Promise<StanjeForme> {
  await dohvatiVlasnika();

  const rezultat = id.safeParse(oblogaId);
  if (!rezultat.success) return { greska: "Neispravan zahtjev." };

  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("obrisi_oblogu", { p_id: rezultat.data });
  // P0001 = poruka iz funkcije („… ne može se obrisati. Možete je arhivirati.").
  if (error?.code === "P0001") return { greska: error.message };
  if (error) return { greska: "Obloga nije obrisana. Pokušajte ponovno." };

  // Sve slike te obloge, uključujući zaostatke neuspjelih uploada. Greška ovdje ne vraća brisanje.
  const mapa = `artikli/${rezultat.data}`;
  const { data: datoteke } = await supabase.storage.from(BUCKET_SLIKA).list(mapa, { limit: 1000 });
  if (datoteke?.length) {
    await supabase.storage.from(BUCKET_SLIKA).remove(datoteke.map((d) => `${mapa}/${d.name}`));
  }

  osvjezi(rezultat.data);
  await postaviObavijest("Obloga je trajno obrisana.");
  redirect("/obloge");
}

/* ---------------------------------------------------------------------------
 * Stanje: dodaj na stanje (ulaz jedne obloge) i poništi ulaz
 * ------------------------------------------------------------------------- */

export type StanjeUlaza = StanjeForme<"kolicina" | "napomena">;

export async function dodajNaStanje(_prethodno: StanjeUlaza, formData: FormData): Promise<StanjeUlaza> {
  await dohvatiVlasnika();

  const rezultat = z
    .object({
      id,
      kolicina: komadi("Količina mora biti između 1 i 1.000.000.").refine((n) => n > 0, "Upišite količinu veću od 0."),
      napomena: z.string().trim().max(200, "Napomena je preduga (najviše 200 znakova)."),
    })
    .safeParse({
      id: tekst(formData, "id"),
      kolicina: tekst(formData, "kolicina"),
      napomena: tekst(formData, "napomena"),
    });
  if (!rezultat.success) return greskeIzZoda(rezultat.error);

  const { id: oblogaId, kolicina, napomena } = rezultat.data;
  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("ulaz_robe", {
    p_stavke: [{ artikl_id: oblogaId, kolicina }],
    p_napomena: napomena,
  });
  if (error?.code === "23503") return { greska: "Obloga više ne postoji." };
  if (error) return { greska: "Stanje nije promijenjeno. Pokušajte ponovno." };

  osvjezi(oblogaId);
  return { uspjeh: `Dodano na stanje: +${kolicina} kom.` };
}

/**
 * Skupni ulaz robe (/obloge/ulaz): više obloga odjednom, jedna napomena za sve.
 * Klijent šalje samo stavke s količinom > 0. Svaka stavka postaje zasebno kretanje „ulaz",
 * pa se u povijesti poništava po oblozi.
 */
export async function spremiUlaz(
  stavke: { artikl_id: number; kolicina: number }[],
  napomena: string,
): Promise<StanjeForme> {
  await dohvatiVlasnika();

  const rezultat = z
    .object({
      stavke: z
        .array(
          z.object({
            artikl_id: id,
            kolicina: z.number().int("Količina mora biti cijeli broj.").min(1, "Količina mora biti veća od 0.").max(1_000_000, "Količina je prevelika."),
          }),
        )
        .min(1, "Upišite količinu barem za jednu oblogu.")
        .max(500, "Previše stavki u jednom ulazu.")
        .refine((s) => new Set(s.map((x) => x.artikl_id)).size === s.length, "Ista obloga je upisana dvaput."),
      napomena: z.string().trim().max(200, "Napomena je preduga (najviše 200 znakova)."),
    })
    .safeParse({ stavke, napomena });
  if (!rezultat.success) return { greska: rezultat.error.issues[0]?.message ?? "Provjerite unesene količine." };

  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("ulaz_robe", {
    p_stavke: rezultat.data.stavke,
    p_napomena: rezultat.data.napomena,
  });
  if (error?.code === "23503") return { greska: "Neka od obloga više ne postoji. Osvježite stranicu." };
  if (error) return { greska: "Ulaz nije spremljen. Pokušajte ponovno." };

  const ukupno = rezultat.data.stavke.reduce((z, s) => z + s.kolicina, 0);
  osvjezi();
  revalidatePath("/obloge/[id]", "page");
  await postaviObavijest(
    `Spremljen ulaz: ${brojSImenicom(rezultat.data.stavke.length, OBLIK_OBLOGA)}, +${formatBroj(ukupno, 0)} kom.`,
  );
  redirect("/obloge");
}

export async function ponistiUlaz(kretanjeId: number): Promise<StanjeForme> {
  await dohvatiVlasnika();

  const rezultat = id.safeParse(kretanjeId);
  if (!rezultat.success) return { greska: "Neispravan zahtjev." };

  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc("ponisti_ulaz", { p_kretanje_id: rezultat.data });
  // P0001 = poruka iz funkcije na hrvatskom („Ovaj ulaz je već poništen.").
  if (error?.code === "P0001") return { greska: error.message };
  if (error) return { greska: "Ulaz nije poništen. Pokušajte ponovno." };

  revalidatePath("/obloge/[id]", "page");
  revalidatePath("/obloge");
  revalidatePath("/");
  return { uspjeh: "Ulaz je poništen. Stanje je ažurirano." };
}

/** „Učitaj još" u povijesti kretanja. */
export async function ucitajJosKretanja(
  artiklId: number,
  prijeId: number,
): Promise<StranicaKretanja | { greska: string }> {
  // Izvan try: redirect() na prijavu mora proći, a ne biti progutan kao greška.
  await dohvatiVlasnika();

  const rezultat = z.object({ artiklId: id, prijeId: id }).safeParse({ artiklId, prijeId });
  if (!rezultat.success) return { greska: "Neispravan zahtjev." };
  try {
    return await dohvatiKretanja(rezultat.data.artiklId, rezultat.data.prijeId);
  } catch {
    return { greska: "Starija povijest se ne može učitati. Pokušajte ponovno." };
  }
}
