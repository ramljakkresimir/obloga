import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { ChevronRight, FileText, PackagePlus, Receipt } from "lucide-react";
import { OtvoreneBiljeske } from "@/components/biljeske/OtvoreneBiljeske";
import { OblogaKartica } from "@/components/obloge/OblogaKartica";
import { Kartica } from "@/components/ui/Kartica";
import { dohvatiVlasnika } from "@/lib/auth";
import { dohvatiOtvoreneBiljeske } from "@/lib/data/biljeske";
import { dohvatiObloge } from "@/lib/data/obloge";
import { dohvatiOtvorenePredracune } from "@/lib/data/predracuni";
import { dohvatiZbrojProdaje } from "@/lib/data/prodaja";
import { brojSImenicom, formatKM, OBLIK_OBLOGA, OBLIK_PREDRACUN, OBLIK_PRODAJA } from "@/lib/format";
import { oblogeNaNiskomStanju } from "@/lib/obloge";
import { graniceUtc, naslovRazdoblja, razdobljeIzParametara } from "@/lib/razdoblje";

/** Raspored po Design.md §2. */
export default function PocetnaPage() {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<KosturPozdrava />}>
        <Pozdrav />
      </Suspense>
      <div className="flex flex-col gap-3">
        <Suspense fallback={<KosturProdajeMjeseca />}>
          <ProdajaMjeseca />
        </Suspense>
        <div className="grid grid-cols-2 gap-3">
          <Suspense fallback={<KosturMaleKartice />}>
            <OtvoreniPredracuni />
          </Suspense>
          <Suspense fallback={<KosturMaleKartice />}>
            <NiskoStanjeBroj />
          </Suspense>
        </div>
      </div>
      <BrzeAkcije />
      <Suspense fallback={<KosturTrake />}>
        <NiskoStanjeTraka />
      </Suspense>
      <Suspense fallback={<KosturBiljeski />}>
        <BiljeskePocetna />
      </Suspense>
    </div>
  );
}

const KLASA_KARTICE =
  "flex items-center gap-2 rounded-[var(--radius-kartica)] border border-rub bg-povrsina p-4 shadow-[var(--shadow-kartica)]";
const KLASA_POVEZNICE = `${KLASA_KARTICE} transition-colors hover:bg-pijesak-svijetli`;

/** Otvoreni predračuni (PRD §5.2): broj i vrijednost; klik vodi na listu (zadani filter je „Otvoreni"). */
async function OtvoreniPredracuni() {
  const { broj, ukupno } = await dohvatiOtvorenePredracune();

  return (
    <Link
      href="/predracuni"
      aria-label={`Otvoreni predračuni: ${brojSImenicom(broj, OBLIK_PREDRACUN)}, ${formatKM(ukupno)}`}
      className={KLASA_POVEZNICE}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-[18px] font-semibold text-sivosmeda">Otvoreni predračuni</p>
        <p className="font-naslov text-2xl leading-8 font-semibold text-espresso tabular-nums">{broj}</p>
        <p className="truncate text-sm text-sivosmeda tabular-nums">{formatKM(ukupno)}</p>
      </div>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-sivosmeda" />
    </Link>
  );
}

/** Broj obloga na niskom stanju; klik skrola na traku ispod brzih akcija. */
async function NiskoStanjeBroj() {
  const broj = oblogeNaNiskomStanju(await dohvatiObloge()).length;

  const sadrzaj = (
    <div className="min-w-0 flex-1">
      <p className="text-[13px] leading-[18px] font-semibold text-sivosmeda">Nisko stanje</p>
      <p
        className={`font-naslov text-2xl leading-8 font-semibold tabular-nums ${broj > 0 ? "text-upozorenje" : "text-espresso"}`}
      >
        {broj}
      </p>
      <p className="truncate text-sm text-sivosmeda">{broj > 0 ? "treba naručiti" : "sve je na stanju"}</p>
    </div>
  );

  if (broj === 0) return <div className={KLASA_KARTICE}>{sadrzaj}</div>;

  return (
    <a
      href="#nisko-stanje"
      aria-label={`Nisko stanje: ${brojSImenicom(broj, OBLIK_OBLOGA)}`}
      className={KLASA_POVEZNICE}
    >
      {sadrzaj}
      <ChevronRight aria-hidden className="size-5 shrink-0 text-sivosmeda" />
    </a>
  );
}

function KosturMaleKartice() {
  return (
    <div
      aria-hidden
      className="flex flex-col gap-2 rounded-[var(--radius-kartica)] border border-rub bg-povrsina p-4 shadow-[var(--shadow-kartica)]"
    >
      <div className="h-4 w-24 animate-pulse rounded-lg bg-rub/60" />
      <div className="h-8 w-10 animate-pulse rounded-lg bg-rub/60" />
      <div className="h-4 w-20 animate-pulse rounded-lg bg-rub/60" />
    </div>
  );
}

/** Nisko stanje (Design §2): vodoravno pomične kartice obloga s oznakom. Prazno → ne prikazuje se. */
async function NiskoStanjeTraka() {
  const obloge = oblogeNaNiskomStanju(await dohvatiObloge());
  if (obloge.length === 0) return null;

  return (
    <section id="nisko-stanje" aria-labelledby="nisko-stanje-naslov" className="flex scroll-mt-20 flex-col gap-3">
      <h3 id="nisko-stanje-naslov" className="font-naslov text-lg leading-[26px] font-semibold text-espresso">
        Nisko stanje
      </h3>
      <ul className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:scroll-px-0 lg:px-0">
        {obloge.map((o) => (
          <li key={o.id} className="flex w-36 shrink-0 snap-start">
            <OblogaKartica obloga={o} sizes="144px" />
          </li>
        ))}
      </ul>
    </section>
  );
}

function KosturTrake() {
  return (
    <div aria-hidden className="flex flex-col gap-3">
      <div className="h-7 w-32 animate-pulse rounded-lg bg-rub/60" />
      <div className="flex gap-3 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-52 w-36 shrink-0 animate-pulse rounded-[var(--radius-kartica)] bg-rub/60" />
        ))}
      </div>
    </div>
  );
}

/** Otvorene bilješke (PRD §5.2, Design §2): tri najnovije s kvačicom. */
async function BiljeskePocetna() {
  const biljeske = await dohvatiOtvoreneBiljeske(3);

  return (
    <Kartica
      naslov="Bilješke"
      akcija={
        <Link href="/biljeske" className="font-semibold text-espresso underline underline-offset-4">
          Sve bilješke
        </Link>
      }
    >
      <OtvoreneBiljeske biljeske={biljeske} />
    </Kartica>
  );
}

function KosturBiljeski() {
  return (
    <div
      aria-hidden
      className="flex flex-col gap-4 rounded-[var(--radius-kartica)] border border-rub bg-povrsina p-4 shadow-[var(--shadow-kartica)]"
    >
      <div className="h-6 w-24 animate-pulse rounded-lg bg-rub/60" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="size-6 shrink-0 animate-pulse rounded-full bg-rub/60" />
          <div className="h-5 flex-1 animate-pulse rounded-lg bg-rub/60" />
        </div>
      ))}
    </div>
  );
}

/** Prodaja ovaj mjesec (PRD §5.1): zbroj potvrđenih, poveznica na pregled prodaje. */
async function ProdajaMjeseca() {
  await connection(); // new Date() tek u vrijeme zahtjeva
  const razdoblje = razdobljeIzParametara({}, new Date());
  const { ukupno, broj } = await dohvatiZbrojProdaje(graniceUtc(razdoblje));

  return (
    <Link
      href="/prodaja"
      className="flex items-center gap-3 rounded-[var(--radius-kartica)] border border-rub bg-povrsina p-4 shadow-[var(--shadow-kartica)] transition-colors hover:bg-pijesak-svijetli"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-[18px] font-semibold text-sivosmeda">Prodaja · {naslovRazdoblja(razdoblje)}</p>
        <p className="font-naslov text-2xl leading-8 font-semibold text-espresso tabular-nums">{formatKM(ukupno)}</p>
        <p className="text-sm text-sivosmeda tabular-nums">{brojSImenicom(broj, OBLIK_PRODAJA)}</p>
      </div>
      <ChevronRight aria-hidden className="size-6 shrink-0 text-sivosmeda" />
    </Link>
  );
}

function KosturProdajeMjeseca() {
  return (
    <div
      aria-hidden
      className="flex flex-col gap-2 rounded-[var(--radius-kartica)] border border-rub bg-povrsina p-4 shadow-[var(--shadow-kartica)]"
    >
      <div className="h-4 w-36 animate-pulse rounded-lg bg-rub/60" />
      <div className="h-8 w-44 animate-pulse rounded-lg bg-rub/60" />
      <div className="h-4 w-20 animate-pulse rounded-lg bg-rub/60" />
    </div>
  );
}

/** Tri brze akcije (Design §2): Novi predračun, Brza prodaja, Ulaz robe. */
function BrzeAkcije() {
  return (
    <section aria-label="Brze akcije" className="grid grid-cols-3 gap-3">
      <Link
        href="/predracuni/novi"
        className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-[var(--radius-kartica)] bg-espresso p-3 text-center font-semibold text-white shadow-[var(--shadow-kartica)] transition-colors hover:bg-smeda"
      >
        <FileText aria-hidden className="size-7" />
        <span className="leading-tight">Novi predračun</span>
      </Link>
      <Link
        href="/prodaja/nova"
        className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-[var(--radius-kartica)] border border-rub bg-povrsina p-3 text-center font-semibold text-espresso shadow-[var(--shadow-kartica)] transition-colors hover:bg-pijesak-svijetli"
      >
        <Receipt aria-hidden className="size-7" />
        <span className="leading-tight">Brza prodaja</span>
      </Link>
      <Link
        href="/obloge/ulaz"
        className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-[var(--radius-kartica)] border border-rub bg-povrsina p-3 text-center font-semibold text-espresso shadow-[var(--shadow-kartica)] transition-colors hover:bg-pijesak-svijetli"
      >
        <PackagePlus aria-hidden className="size-7" />
        <span className="leading-tight">Ulaz robe</span>
      </Link>
    </section>
  );
}

function pozdravZaSat(sat: number) {
  if (sat < 10) return "Dobro jutro";
  if (sat < 18) return "Dobar dan";
  return "Dobra večer";
}

async function Pozdrav() {
  const vlasnik = await dohvatiVlasnika();
  const sada = new Date();
  const sat = Number(
    new Intl.DateTimeFormat("hr-HR", { hour: "numeric", hourCycle: "h23", timeZone: "Europe/Sarajevo" }).format(sada),
  );
  const datum = new Intl.DateTimeFormat("hr-HR", {
    weekday: "long",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: "Europe/Sarajevo",
  }).format(sada);

  return (
    <div>
      <h2 className="font-naslov text-2xl leading-8 font-semibold text-espresso">
        {pozdravZaSat(sat)}, {vlasnik.ime}
      </h2>
      <p className="text-sivosmeda">{datum}</p>
    </div>
  );
}

function KosturPozdrava() {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      <div className="h-8 w-56 animate-pulse rounded-lg bg-rub/60" />
      <div className="h-5 w-40 animate-pulse rounded-lg bg-rub/60" />
    </div>
  );
}
