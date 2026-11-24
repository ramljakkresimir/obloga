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
  izracunajPredracun,
  podaciZaRpc,
  prevelikIznos,
  type PdvPostavke,
  type PodaciPredracuna,
  type SnimakStavke,
} from "@/lib/predracuni";
import { dopuniSnimakObloga, shemaPodataka, zId as id } from "@/lib/spremanjePredracuna";
import { createClient } from "@/utils/supabase/server";

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

  const greskaSnimka = await dopuniSnimakObloga(supabase, p.stavke, snimak, "Predračun nije spremljen. Pokušajte ponovno.");
  if (greskaSnimka) return { greska: greskaSnimka };

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
