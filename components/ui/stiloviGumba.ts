// Klase gumba, zajedničke za <Gumb> (client) i <GumbPoveznica> (server). Bez "use client".

export type Varijanta = "primarni" | "sekundarni" | "naglasni" | "opasni" | "tekstualni" | "opasni-tekstualni";

const stilovi: Record<Varijanta, string> = {
  primarni: "bg-espresso text-white hover:bg-smeda active:bg-smeda",
  sekundarni: "bg-povrsina text-espresso border border-espresso hover:bg-pozadina",
  naglasni: "bg-narancasta text-espresso hover:bg-jantar",
  opasni: "bg-povrsina text-greska border border-greska hover:bg-greska-pozadina",
  tekstualni: "text-espresso hover:bg-rub/50",
  "opasni-tekstualni": "text-greska hover:bg-greska-pozadina",
};

export function klaseGumba(varijanta: Varijanta = "primarni", punaSirina = false, className = "") {
  return `inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-polje)] px-5 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${stilovi[varijanta]} ${punaSirina ? "w-full" : ""} ${className}`;
}
