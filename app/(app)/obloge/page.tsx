import type { Metadata } from "next";
import { UIzradi } from "@/components/ui/UIzradi";

export const metadata: Metadata = { title: "Obloge" };

export default function Page() {
  return <UIzradi naslov="Obloge" />;
}
