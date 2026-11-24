"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { dohvatiVlasnika } from "@/lib/auth";
import { postaviObavijest, type StanjeForme } from "@/lib/akcije";
import { dohvatiPostavke } from "@/lib/data/postavke";
import { dohvatiPredracune, filterIzParametra, type StranicaPredracuna } from "@/lib/data/predracuni";
import {
  DUZINA,
  imaNajviseDecimala,
  izracunajPredracun,
  NAJVISE_KM,
  NAJVISE_KOMADA,
  NAJVISE_M2,
  NAJVISE_STAVKI,
  podaciZaRpc,
  prevelikIznos,
  type PdvPostavke,
  type PodaciPredracuna,
  type SnimakStavke,
} from "@/lib/predracuni";
import { createClient } from "@/utils/supabase/server";

const id = z.number().int().positive();

/* ---------------------------------------------------------------------------
 * Validacija (ista pravila kao procitajUredivac u lib/predracuni.ts)
 * ------------------------------------------------------------------------- */

const km = (najvise = NAJVISE_KM) =>
  z.number().finite().min(0).max(najvise).refine((n) => imaNajviseDecimala(n, 2), "Najviše 2 decimale.");

const tekst = (najvise: number) => z.string().trim().max(najvise, `Najviše ${najvise} znakova.`);

const shemaPodataka = z.object({
  kupacIme: tekst(DUZINA.kupacIme),
  kupacTelefon: tekst(DUZINA.kupacTelefon),
  kupacMjesto: tekst(DUZINA.kupacMjesto),
  napomena: tekst(DUZINA.napomena),
  stavke: z
    .array(
      z
        .object({
          artiklId: id,
          unos: z.enum(["m2", "kom"]),
          kolicina: z.number().finite().positive("Količina mora biti veća od 0."),
        })
        .refine(
          (s) =>
            s.unos === "kom"
              ? Number.isInteger(s.kolicina) && s.kolicina <= NAJVISE_KOMADA
              : imaNajviseDecimala(s.kolicina, 2) && s.kolicina <= NAJVISE_M2,
          "Neispravna količina.",
        ),
    )
    .min(1, "Dodajte barem jednu oblogu.")
    .max(NAJVISE_STAVKI, "Previše stavki u jednom predračunu.")
    .refine((s) => new Set(s.map((x) => x.artiklId)).size === s.length, "Ista obloga je dodana dvaput."),
  ugradnja: z
    .object({
      m2: z.number().finite().positive().max(NAJVISE_M2).refine((n) => imaNajviseDecimala(n, 2)),
      cijenaM2: km(),
    })
    .nullable(),
  ljepilo: z.object({ kom: z.number().int().positive().max(NAJVISE_KOMADA), cijena: km() }).nullable(),
  prijevoz: km().nullable(),
  popust: z
    .object({ tip: z.enum(["posto", "km"]), vrijednost: km() })
    .refine((p) => p.tip === "km" || p.vrijednost <= 100, "Popust može biti najviše 100 %.")
    .nullable(),
});

/** Osvježi sve što prikazuje predračune i stanje. */
function osvjezi(predracunId?: number, diraStanje = false) {
  revalidatePath("/predracuni");
  if (predracunId) revalidatePath(`/predracuni/${predracunId}`);
  revalidatePath("/");
  if (diraStanje) {
    revalidatePath("/obloge");
    revalidatePath("/obloge/[id]", "page");
    revalidatePath("/prodaja");
  }
}

/* ---------------------------------------------------------------------------
 * Spremi (novi ili izmjena otvorenog)
 * ------------------------------------------------------------------------- */

/**
 * Sprema predračun i preusmjerava na detalje. Cijene stavki i PDV ne dolaze s klijenta:
 * - postojeće stavke otvorenog predračuna zadržavaju spremljeni snimak (naziv, cijena, m²/kom),
 * - nove stavke uzimaju trenutne podatke aktivne obloge,
 * - PDV: novi predračun uzima trenutne Postavke, izmjena zadržava snimak.
 * Iznosi se ponovno računaju istom kalkulacijom kao u uređivaču.
 */
export async function spremiPredracun(
  predracunId: number | null,
  podaci: PodaciPredracuna,
  kopijaOd: number | null,
): Promise<StanjeForme> {
  await dohvatiVlasnika();

  const ulaz = z
    .object({ predracunId: id.nullable(), podaci: shemaPodataka, kopijaOd: id.nullable() })
    .safeParse({ predracunId, podaci, kopijaOd });
  if (!ulaz.success) return { greska: ulaz.error.issues[0]?.message ?? "Provjerite unesene podatke." };
  const p = ulaz.data.podaci;

  const supabase = createClient(await cookies());
  const snimak = new Map<number, SnimakStavke>();
  let pdv: PdvPostavke;

  if (ulaz.data.predracunId) {
    const { data, error } = await supabase
      .from("predracuni")
      .select(
        "status, vrsta, pdv_u_sustavu, pdv_cijene_sa_pdv, pdv_stopa, predracun_stavke(artikl_id, naziv, cijena_kom, m2_po_komadu)",
      )
      .eq("id", ulaz.data.predracunId)
      .maybeSingle();
    if (error) return { greska: "Predračun nije spremljen. Pokušajte ponovno." };
    if (!data || data.vrsta !== "predracun") return { greska: "Predračun više ne postoji." };
    if (data.status !== "otvoren") return { greska: "Predračun se može urediti samo dok je otvoren." };

    pdv = { uSustavu: data.pdv_u_sustavu, cijeneSaPdv: data.pdv_cijene_sa_pdv, stopa: data.pdv_stopa };
    for (const s of data.predracun_stavke) {
      snimak.set(s.artikl_id, { naziv: s.naziv, cijenaKom: s.cijena_kom, m2PoKomadu: s.m2_po_komadu });
    }
  } else {
    const postavke = await dohvatiPostavke();
    pdv = { uSustavu: postavke.u_sustavu_pdv, cijeneSaPdv: postavke.cijene_sa_pdv, stopa: postavke.pdv_stopa };
  }

  const nove = p.stavke.map((s) => s.artiklId).filter((a) => !snimak.has(a));
  if (nove.length > 0) {
    const { data, error } = await supabase
      .from("artikli")
      .select("id, naziv, cijena_kom, m2_po_komadu, aktivan")
      .in("id", nove);
    if (error) return { greska: "Predračun nije spremljen. Pokušajte ponovno." };
    for (const o of data) {
      if (!o.aktivan) return { greska: `Obloga „${o.naziv}” je arhivirana i ne može se dodati. Uklonite je.` };
      snimak.set(o.id, { naziv: o.naziv, cijenaKom: o.cijena_kom, m2PoKomadu: o.m2_po_komadu });
    }
    if (nove.some((a) => !snimak.has(a))) return { greska: "Neka od obloga više ne postoji. Osvježite stranicu." };
  }

  for (const s of p.stavke) {
    const o = snimak.get(s.artiklId)!;
    if (s.unos === "m2" && o.m2PoKomadu == null) {
      return { greska: `Obloga „${o.naziv}” nema m² po komadu. Upišite količinu u komadima.` };
    }
  }

  let rpcPodaci: ReturnType<typeof podaciZaRpc>;
  try {
    const { rezultat } = izracunajPredracun(p, snimak, pdv);
    if (prevelikIznos(rezultat)) return { greska: "Iznos predračuna je prevelik. Provjerite količine i cijene." };
    rpcPodaci = podaciZaRpc(p, snimak, pdv, rezultat, ulaz.data.predracunId ? null : ulaz.data.kopijaOd);
  } catch (e) {
    return { greska: e instanceof Error ? e.message : "Provjerite unesene podatke." };
  }

  const { data: spremljenId, error } = await supabase.rpc("spremi_predracun", {
    // null = novi predračun (funkcija dodjeljuje broj); generirani tip ne zna da je p_id nullable.
    p_id: ulaz.data.predracunId as number,
    p_podaci: rpcPodaci,
  });
  // P0001 = poruka iz funkcije na hrvatskom („Predračun se može urediti samo dok je otvoren.").
  if (error?.code === "P0001") return { greska: error.message };
  if (error?.code === "23503") return { greska: "Neka od obloga više ne postoji. Osvježite stranicu." };
  if (error || !spremljenId) return { greska: "Predračun nije spremljen. Pokušajte ponovno." };

  const { data: spremljen } = await supabase.from("predracuni").select("broj").eq("id", spremljenId).maybeSingle();

  osvjezi(spremljenId);
  await postaviObavijest(spremljen?.broj ? `Predračun ${spremljen.broj} je spremljen.` : "Predračun je spremljen.");
  redirect(`/predracuni/${spremljenId}`);
}

/* ---------------------------------------------------------------------------
 * Promjena statusa
 * ------------------------------------------------------------------------- */

type RpcStatusa = "potvrdi_predracun" | "odbij_predracun" | "storniraj_predracun";

async function promijeniStatus(
  predracunId: number,
  rpc: RpcStatusa,
  poruke: { uspjeh: (broj: string) => string; greska: string },
): Promise<StanjeForme> {
  await dohvatiVlasnika();

  const rezultat = id.safeParse(predracunId);
  if (!rezultat.success) return { greska: "Neispravan zahtjev." };

  const supabase = createClient(await cookies());
  const { error } = await supabase.rpc(rpc, { p_id: rezultat.data });
  // P0001 = poruka iz funkcije („Samo otvoren predračun se može potvrditi.").
  if (error?.code === "P0001") return { greska: error.message };
  if (error) return { greska: poruke.greska };

  const { data } = await supabase.from("predracuni").select("broj").eq("id", rezultat.data).maybeSingle();

  osvjezi(rezultat.data, rpc !== "odbij_predracun");
  return { uspjeh: poruke.uspjeh(data?.broj ?? "") };
}

/** Potvrdi: kupac je pristao, roba se skida sa stanja (i u minus, uz upozorenje u UI-ju). */
export async function potvrdiPredracun(predracunId: number): Promise<StanjeForme> {
  return promijeniStatus(predracunId, "potvrdi_predracun", {
    uspjeh: (broj) => `Predračun ${broj} je potvrđen. Stanje je ažurirano.`,
    greska: "Predračun nije potvrđen. Pokušajte ponovno.",
  });
}

export async function odbijPredracun(predracunId: number): Promise<StanjeForme> {
  return promijeniStatus(predracunId, "odbij_predracun", {
    uspjeh: (broj) => `Predračun ${broj} je odbijen.`,
    greska: "Predračun nije odbijen. Pokušajte ponovno.",
  });
}

/** Storniraj potvrđeni predračun: roba se vraća na stanje. */
export async function stornirajPredracun(predracunId: number): Promise<StanjeForme> {
  return promijeniStatus(predracunId, "storniraj_predracun", {
    uspjeh: (broj) => `Predračun ${broj} je storniran. Roba je vraćena na stanje.`,
    greska: "Predračun nije storniran. Pokušajte ponovno.",
  });
}

/* ---------------------------------------------------------------------------
 * Lista: „Učitaj još"
 * ------------------------------------------------------------------------- */

export async function ucitajJosPredracuna(
  status: string,
  q: string,
  prijeId: number,
): Promise<StranicaPredracuna | { greska: string }> {
  // Izvan try: redirect() na prijavu mora proći, a ne biti progutan kao greška.
  await dohvatiVlasnika();

  const rezultat = z.object({ q: z.string().max(200), prijeId: id }).safeParse({ q, prijeId });
  if (!rezultat.success) return { greska: "Neispravan zahtjev." };
  try {
    return await dohvatiPredracune({ status: filterIzParametra(status), q: rezultat.data.q, prijeId: rezultat.data.prijeId });
  } catch {
    return { greska: "Stariji predračuni se ne mogu učitati. Pokušajte ponovno." };
  }
}
