import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Sve rute osim statike, slika, fontova i manifesta
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|ttf|woff2?|webmanifest)$).*)",
  ],
};
