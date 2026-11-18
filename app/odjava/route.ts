import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { KOLACIC_AKTIVNOST } from "@/lib/sesija";

/**
 * Prisilna odjava (npr. prijavljen korisnik koji nije u tablici `vlasnici`).
 * Server Components ne mogu brisati kolačiće, pa DAL preusmjerava ovamo.
 * Obična odjava ide preko Server Action `odjava` (app/prijava/actions.ts).
 */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  await supabase.auth.signOut({ scope: "local" });
  cookieStore.delete(KOLACIC_AKTIVNOST);

  const url = request.nextUrl.clone();
  url.pathname = "/prijava";
  url.search = "";
  if (request.nextUrl.searchParams.get("razlog") === "pristup") {
    url.searchParams.set("razlog", "pristup");
  }
  return NextResponse.redirect(url);
}
