import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import type { Database } from "@/utils/supabase/types";

/**
 * Keepalive za besplatni Supabase projekt (Tech.md §16): Vercel Cron 1× dnevno
 * zove ovu rutu s `Authorization: Bearer ${CRON_SECRET}`, a ruta pozove RPC `ping()`.
 * Javna je u proxyju (`JAVNE_RUTE`), pa je CRON_SECRET jedina zaštita.
 */
export async function GET(request: NextRequest) {
  const tajna = process.env.CRON_SECRET;
  if (!tajna || request.headers.get("authorization") !== `Bearer ${tajna}`) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data, error } = await supabase.rpc("ping");
  if (error) {
    console.error("Keepalive ping nije uspio:", error.message);
    return Response.json({ ok: false }, { status: 500 });
  }

  return Response.json({ ok: true, vrijeme: data });
}
