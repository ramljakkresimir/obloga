import { BocnaTraka, DonjaNavigacija, Zaglavlje } from "@/components/navigacija/Navigacija";
import { ZastitaIzlaskaProvider } from "@/components/navigacija/ZastitaIzlaska";
import { ObavijestProvider } from "@/components/ui/Obavijest";

/**
 * Zaštićeni dio aplikacije. Proxy već preusmjerava neprijavljene na /prijava,
 * a podaci se dodatno štite u DAL-u (lib/auth.ts) i RLS-om.
 * Layout namjerno ne čita sesiju na vrhu, da ne blokira cijeli segment (Cache Components).
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <ObavijestProvider>
      <ZastitaIzlaskaProvider>
      <div className="flex flex-1">
        <BocnaTraka />
        <div className="flex min-w-0 flex-1 flex-col">
          <Zaglavlje />
          <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:px-8 lg:pt-8 lg:pb-8">
            {children}
          </main>
          <DonjaNavigacija />
        </div>
      </div>
      </ZastitaIzlaskaProvider>
    </ObavijestProvider>
  );
}
