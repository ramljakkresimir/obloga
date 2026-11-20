import Form from "next/form";
import Link from "next/link";
import { Search, X } from "lucide-react";

/** Pretraga bilješki preko ?q= (GET forma, radi i bez JavaScripta). */
export function PretragaBiljeski({ pocetno }: { pocetno: string }) {
  return (
    <Form action="/biljeske" replace className="relative" role="search">
      <label htmlFor="pretraga-biljeski" className="sr-only">
        Traži bilješke
      </label>
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-sivosmeda" />
      <input
        // key: polje se osvježi kad se pretraga promijeni izvana (npr. „Očisti").
        key={pocetno}
        id="pretraga-biljeski"
        type="search"
        name="q"
        enterKeyHint="search"
        defaultValue={pocetno}
        placeholder="Traži bilješke…"
        className="h-12 w-full rounded-[var(--radius-polje)] border border-rub bg-povrsina pr-12 pl-12 text-base text-tekst placeholder:text-sivosmeda/70 focus:border-narancasta focus:outline-none focus-visible:ring-2 focus-visible:ring-narancasta [&::-webkit-search-cancel-button]:hidden"
      />
      {pocetno && (
        <Link
          href="/biljeske"
          replace
          aria-label="Očisti pretragu"
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-[var(--radius-polje)] text-sivosmeda hover:text-espresso"
        >
          <X aria-hidden className="size-5" />
        </Link>
      )}
    </Form>
  );
}
