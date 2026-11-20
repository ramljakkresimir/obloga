import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Zajednicko = { odabran?: boolean; children: ReactNode; className?: string };
type KaoPoveznica = Zajednicko & { href: string };
type KaoGumb = Zajednicko & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { href?: undefined };

function izgled(odabran?: boolean) {
  return `flex h-9 items-center rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors ${
    odabran ? "border-pijesak bg-pijesak-svijetli text-espresso" : "border-rub bg-povrsina text-sivosmeda group-hover:text-espresso"
  }`;
}

/**
 * Čip za filtere (kategorije, statusi). Kao poveznica (href, npr. ?kategorija=3) ili kao gumb.
 * Vidljivi čip je 36 px, a dodirna površina 48 px.
 */
export function Cip(props: KaoPoveznica | KaoGumb) {
  const omotac = (className = "") => `group flex min-h-12 shrink-0 items-center focus-visible:outline-none ${className}`;

  if (props.href !== undefined) {
    const { href, odabran, children, className } = props;
    return (
      <Link href={href} aria-current={odabran ? "true" : undefined} className={omotac(className)}>
        <span className={izgled(odabran)}>{children}</span>
      </Link>
    );
  }

  const { odabran, children, className, type = "button", ...gumb } = props;
  return (
    <button type={type} aria-pressed={odabran ?? false} className={omotac(className)} {...gumb}>
      <span className={izgled(odabran)}>{children}</span>
    </button>
  );
}

/** Vodoravno pomična traka čipova, do rubova ekrana na mobitelu. */
export function CipTraka({ oznaka, children }: { oznaka: string; children: ReactNode }) {
  return (
    <div
      role="group"
      aria-label={oznaka}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {children}
    </div>
  );
}
