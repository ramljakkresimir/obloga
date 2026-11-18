import type { Metadata } from "next";
import { UIzradi } from "@/components/ui/UIzradi";

export const metadata: Metadata = { title: "Predračuni" };

export default function Page() {
  return <UIzradi naslov="Predračuni" />;
}
