"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { dohvatiVlasnika } from "@/lib/auth";
import { postaviObavijest, type StanjeForme } from "@/lib/akcije";
import { dohvatiPostavke } from "@/lib/data/postavke";
import {
  izracunajPredracun,
  podaciZaRpc,
  prevelikIznos,
  type PdvPostavke,
  type PodaciPredracuna,
  type SnimakStavke,
} from "@/lib/predracuni";
import { dopuniSnimakObloga, shemaPodataka, zId } from "@/lib/spremanjePredracuna";
import { createClient } from "@/utils/supabase/server";

const GRESKA_SPREMANJA = "Prodaja nije spremljena. Pokušajte ponovno.";

/** Brza prodaja (PRD §5.6): bez kupca i dodataka, samo obloge, popust i interna napomena. */
const shemaBrzeProdaje = shemaPodataka.refine(
  (p) => !p.kupacIme && !p.kupacTelefon && !p.kupacMjesto && !p.ugradnja && !p.ljepilo && p.prijevoz === null,
  "Brza prodaja nema kupca ni dodataka.",
);

/** Osvježi sve što prikazuje prodaju i stanje. */
function osvjezi(prodajaId: number) {
  revalidatePath("/prodaja");
  revalidatePath(`/prodaja/${prodajaId}`);
  revalidatePath("/");
  revalidatePath("/obloge");
  revalidatePath("/obloge/[id]", "page");
}

/**
 * Potvrdi brzu prodaju: odmah skida stanje (i u minus, uz upozorenje u UI-ju) i preusmjerava na detalje.
 * Cijene i PDV ne dolaze s klijenta: trenutne cijene aktivnih obloga i trenutne Postavke.
 * Iznosi se ponovno računaju istom kalkulacijom kao u uređivaču.
 */
export async function spremiBrzuProdaju(podaci: PodaciPredracuna): Promise<StanjeForme> {
  await dohvatiVlasnika();

  const ulaz = shemaBrzeProdaje.safeParse(podaci);
  if (!ulaz.success) return { greska: ulaz.error.issues[0]?.message ?? "Provjerite unesene podatke." };
  const p = ulaz.data;

  const supabase = createClient(await cookies());
  const postavke = await dohvatiPostavke();
  const pdv: PdvPostavke = {
    uSustavu: postavke.u_sustavu_pdv,
    cijeneSaPdv: postavke.cijene_sa_pdv,
    stopa: postavke.pdv_stopa,
  };

  const snimak = new Map<number, SnimakStavke>();
  const greskaSnimka = await dopuniSnimakObloga(supabase, p.stavke, snimak, GRESKA_SPREMANJA);
  if (greskaSnimka) return { greska: greskaSnimka };

  let rpcPodaci: ReturnType<typeof podaciZaRpc>;
  try {
    const { rezultat } = izracunajPredracun(p, snimak, pdv);
    if (prevelikIznos(rezultat)) return { greska: "Iznos prodaje je prevelik. Provjerite količine i cijene." };
    rpcPodaci = podaciZaRpc(p, snimak, pdv, rezultat, null);
  } catch (e) {
    return { greska: e instanceof Error ? e.message : "Provjerite unesene podatke." };
  }

  const { data: prodajaId, error } = await supabase.rpc("brza_prodaja", { p_podaci: rpcPodaci });
  // P0001 = poruka iz funkcije na hrvatskom („Prodaja mora imati barem jednu stavku.").
  if (error?.code === "P0001") return { greska: error.message };
  if (error?.code === "23503") return { greska: "Neka od obloga više ne postoji. Osvježite stranicu." };
  if (error || !prodajaId) return { greska: GRESKA_SPREMANJA };

  osvjezi(prodajaId);
  await postaviObavijest("Prodaja je spremljena. Stanje je ažurirano.");
  redirect(`/prodaja/${prodajaId}`);
}

/** Storniraj brzu prodaju: roba se vraća na stanje. */
export async function stornirajBrzuProdaju(prodajaId: number): Promise<StanjeForme> {
  await dohvatiVlasnika();

  const rezultat = zId.safeParse(prodajaId);
  if (!rezultat.success) return { greska: "Neispravan zahtjev." };

  const supabase = createClient(await cookies());
  // storniraj_predracun radi za obje vrste; ova akcija smije samo brzu prodaju (predračun ima svoju).
  const { data: prodaja, error: greskaCitanja } = await supabase
    .from("predracuni")
    .select("vrsta")
    .eq("id", rezultat.data)
    .maybeSingle();
  if (greskaCitanja) return { greska: "Prodaja nije stornirana. Pokušajte ponovno." };
  if (prodaja?.vrsta !== "brza_prodaja") return { greska: "Prodaja ne postoji." };

  const { error } = await supabase.rpc("storniraj_predracun", { p_id: rezultat.data });
  // P0001 = poruka iz funkcije („Stornirati se može samo potvrđena prodaja.").
  if (error?.code === "P0001") return { greska: error.message };
  if (error) return { greska: "Prodaja nije stornirana. Pokušajte ponovno." };

  osvjezi(rezultat.data);
  return { uspjeh: "Prodaja je stornirana. Roba je vraćena na stanje." };
}
