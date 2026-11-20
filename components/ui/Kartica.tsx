import type { HTMLAttributes, ReactNode } from "react";

type Props = HTMLAttributes<HTMLElement> & {
  naslov?: string;
  /** Sadržaj desno od naslova (npr. tekstualni gumb ili poveznica). */
  akcija?: ReactNode;
};

/** Bijela kartica s rubom, zaobljenjem 16 px i blagom toplom sjenom. */
export function Kartica({ naslov, akcija, className = "", children, ...props }: Props) {
  return (
    <section
      className={`rounded-[var(--radius-kartica)] border border-rub bg-povrsina p-4 shadow-[var(--shadow-kartica)] ${className}`}
      {...props}
    >
      {(naslov || akcija) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {naslov && <h3 className="font-naslov text-lg leading-[26px] font-semibold text-espresso">{naslov}</h3>}
          {akcija}
        </div>
      )}
      {children}
    </section>
  );
}
