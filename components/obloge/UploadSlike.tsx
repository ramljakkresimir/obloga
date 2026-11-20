"use client";

import { useId } from "react";
import { Camera, ImageUp } from "lucide-react";
import { slikaUrl } from "@/lib/slike";

type Props = {
  /** Trenutna slika obloge (artikli.slika), ako postoji. */
  postojeca: string | null;
  /** blob: URL novo odabrane datoteke (još nije uploadana); stvara ga i oslobađa roditelj. */
  pregled: string | null;
  onOdabir: (datoteka: File) => void;
  greska?: string;
  disabled?: boolean;
};

/**
 * Odabir slike: na mobitelu <input type="file" accept="image/*"> nudi kameru ili galeriju.
 * Slika se ovdje samo prikazuje; smanjivanje i upload rade se pri spremanju forme.
 */
export function UploadSlike({ postojeca, pregled, onOdabir, greska, disabled }: Props) {
  const id = useId();
  const src = pregled ?? slikaUrl(postojeca);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] leading-[18px] font-semibold text-sivosmeda">Slika</span>
      <label
        htmlFor={id}
        className={`relative flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-[var(--radius-kartica)] border-2 border-dashed bg-povrsina text-sivosmeda transition-colors hover:border-drvo has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-narancasta ${
          greska ? "border-greska" : src ? "border-transparent" : "border-rub"
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        {src ? (
          <>
            {/* Pregled lokalne datoteke (blob:) ili već spremljene slike; next/image ovdje ne pomaže. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="Odabrana slika obloge"
              className="absolute inset-0 size-full bg-pozadina object-contain"
            />
            <span className="absolute right-3 bottom-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-espresso/85 px-4 text-sm font-semibold text-white">
              <ImageUp aria-hidden className="size-4" />
              Promijeni
            </span>
          </>
        ) : (
          <>
            <Camera aria-hidden className="size-10 text-drvo" />
            <span className="px-6 text-center font-semibold text-espresso">Fotografiraj ili odaberi sliku</span>
            <span className="text-sm">JPG, PNG ili WebP</span>
          </>
        )}
        <input
          id={id}
          type="file"
          accept="image/*"
          disabled={disabled}
          className="sr-only"
          aria-invalid={greska ? true : undefined}
          aria-describedby={greska ? `${id}-greska` : undefined}
          onChange={(e) => {
            const odabrana = e.target.files?.[0];
            if (odabrana) onOdabir(odabrana);
            e.target.value = ""; // ista datoteka se može odabrati ponovno
          }}
        />
      </label>
      {greska && (
        <p id={`${id}-greska`} className="text-sm text-greska">
          {greska}
        </p>
      )}
    </div>
  );
}
