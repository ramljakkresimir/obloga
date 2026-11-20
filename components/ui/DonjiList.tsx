"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

type Props = {
  otvoren: boolean;
  /** Poziva se na ✕, dodir izvan lista i Esc. Roditelj postavlja otvoren = false. */
  onZatvori: () => void;
  naslov: string;
  children: ReactNode;
};

/**
 * Donji list (bottom sheet) na nativnom <dialog>: preglednik rješava fokus, Esc i top layer.
 * Na računalu (≥ 1024 px) prikazuje se kao centrirani modal.
 */
export function DonjiList({ otvoren, onZatvori, naslov, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const naslovId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (otvoren && !dialog.open) dialog.showModal();
    if (!otvoren && dialog.open) dialog.close();
  }, [otvoren]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={naslovId}
      onClose={onZatvori}
      // Dodir izvan sadržaja pogađa sam <dialog> (pozadinu), ne unutarnji div.
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      className="m-0 mt-auto max-h-[90dvh] w-full max-w-none overflow-hidden rounded-t-[20px] bg-povrsina p-0 text-tekst shadow-[var(--shadow-kartica)] transition-transform duration-200 backdrop:bg-espresso/40 starting:open:translate-y-full lg:m-auto lg:max-w-lg lg:rounded-[20px] lg:starting:open:translate-y-4"
    >
      <div className="flex max-h-[90dvh] flex-col">
        <div className="flex justify-center pt-2 lg:hidden" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-rub" />
        </div>
        <div className="flex items-center gap-2 py-1 pr-2 pl-4 lg:pt-3">
          <h2 id={naslovId} className="flex-1 font-naslov text-lg leading-[26px] font-semibold text-espresso">
            {naslov}
          </h2>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Zatvori"
            className="flex size-12 items-center justify-center rounded-full text-sivosmeda hover:text-espresso"
          >
            <X aria-hidden className="size-6" />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-4 pt-2 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </dialog>
  );
}
