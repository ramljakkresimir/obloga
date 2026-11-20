import Link from "next/link";
import type { ComponentProps } from "react";
import { klaseGumba, type Varijanta } from "./stiloviGumba";

type Props = ComponentProps<typeof Link> & { varijanta?: Varijanta; punaSirina?: boolean };

/** Poveznica koja izgleda kao gumb (npr. „Uredi", „Dodaj prvu oblogu"). */
export function GumbPoveznica({ varijanta = "primarni", punaSirina, className = "", ...props }: Props) {
  return <Link className={klaseGumba(varijanta, punaSirina, className)} {...props} />;
}
