// Slike obloga (Tech.md §10): smanjivanje u pregledniku prije uploada i URL za prikaz.

export const BUCKET_SLIKA = "slike-obloga";

const NAJVECA_STRANICA = 1200;

/** Statična slika iz public/ ('/slike/obloge/x.jpg') ili vanjski URL; inače putanja u Storageu. */
export function jeStorageSlika(slika: string | null | undefined): slika is string {
  return !!slika && !slika.startsWith("/") && !/^https?:\/\//.test(slika);
}

/** artikli.slika → URL za <Image>. Bez slike → null. */
export function slikaUrl(slika: string | null | undefined): string | null {
  if (!slika) return null;
  if (!jeStorageSlika(slika)) return slika;
  const putanja = slika.split("/").map(encodeURIComponent).join("/");
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_SLIKA}/${putanja}`;
}

/** Putanja nove slike u Storageu: artikli/{id}/{timestamp}.{ekstenzija}. */
export function putanjaSlike(artiklId: number, ekstenzija: string): string {
  return `artikli/${artiklId}/${Date.now()}.${ekstenzija}`;
}

/** Je li putanja nova slika baš ove obloge (štiti postaviSliku od tuđih putanja). */
export function jePutanjaSlikeObloge(putanja: string, artiklId: number): boolean {
  return new RegExp(`^artikli/${artiklId}/\\d+\\.(webp|jpg|png)$`).test(putanja);
}

export type SmanjenaSlika = { blob: Blob; tip: "image/webp" | "image/jpeg"; ekstenzija: "webp" | "jpg" };

function uBlob(canvas: HTMLCanvasElement, tip: string, kvaliteta: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, tip, kvaliteta));
}

async function ucitaj(
  datoteka: File,
): Promise<{ izvor: CanvasImageSource; sirina: number; visina: number; zatvori: () => void }> {
  // createImageBitmap poštuje EXIF orijentaciju (fotografije s mobitela).
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(datoteka, { imageOrientation: "from-image" });
      return { izvor: bitmap, sirina: bitmap.width, visina: bitmap.height, zatvori: () => bitmap.close() };
    } catch {
      // Neki preglednici ne podržavaju opcije; pokušaj preko <img>.
    }
  }
  const url = URL.createObjectURL(datoteka);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { izvor: img, sirina: img.naturalWidth, visina: img.naturalHeight, zatvori: () => URL.revokeObjectURL(url) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

/**
 * Smanji sliku na najviše 1200 px po dužoj strani i spremi kao WebP (~0,8), uz zadržan omjer.
 * Preglednici koji ne znaju kodirati WebP (stariji Safari) dobiju JPEG.
 * Baca Error s porukom na hrvatskom ako se slika ne može pročitati.
 */
export async function smanjiSliku(datoteka: File): Promise<SmanjenaSlika> {
  let slika: Awaited<ReturnType<typeof ucitaj>>;
  try {
    slika = await ucitaj(datoteka);
  } catch {
    throw new Error("Slika se ne može pročitati. Odaberite JPG, PNG ili WebP sliku.");
  }

  try {
    const omjer = Math.min(1, NAJVECA_STRANICA / Math.max(slika.sirina, slika.visina));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(slika.sirina * omjer));
    canvas.height = Math.max(1, Math.round(slika.visina * omjer));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Slika se ne može obraditi u ovom pregledniku.");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(slika.izvor, 0, 0, canvas.width, canvas.height);

    const webp = await uBlob(canvas, "image/webp", 0.8);
    if (webp && webp.type === "image/webp") return { blob: webp, tip: "image/webp", ekstenzija: "webp" };

    const jpeg = await uBlob(canvas, "image/jpeg", 0.82);
    if (jpeg) return { blob: jpeg, tip: "image/jpeg", ekstenzija: "jpg" };
    throw new Error("Slika se ne može obraditi u ovom pregledniku.");
  } finally {
    slika.zatvori();
  }
}
