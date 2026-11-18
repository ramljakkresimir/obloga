import type { Metadata } from "next";
import { UIzradi } from "@/components/ui/UIzradi";

export const metadata: Metadata = { title: "Bilješke" };

export default function Page() {
  return <UIzradi naslov="Bilješke" />;
}
