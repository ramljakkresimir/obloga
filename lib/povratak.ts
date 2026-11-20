// Pamti zadnji URL liste s filterom (npr. /obloge?k=3&q=hrast), da „Natrag" u zaglavlju
// vrati na isti filter. sessionStorage: samo za ovu karticu preglednika; greške se ignoriraju.

const kljuc = (putanja: string) => `povratak:${putanja}`;

export function zapamtiPovratak(putanja: string, url: string) {
  try {
    if (url === putanja) sessionStorage.removeItem(kljuc(putanja));
    else sessionStorage.setItem(kljuc(putanja), url);
  } catch {
    // privatni način ili blokirana pohrana – „Natrag" vodi na listu bez filtera
  }
}

/** Spremljeni URL za putanju, samo ako je to ista putanja s parametrima. */
export function procitajPovratak(putanja: string): string | null {
  try {
    const url = sessionStorage.getItem(kljuc(putanja));
    return url?.startsWith(`${putanja}?`) ? url : null;
  } catch {
    return null;
  }
}
