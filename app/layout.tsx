import type { Metadata, Viewport } from "next";
import { Nunito_Sans, Poppins } from "next/font/google";
import "./globals.css";

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin", "latin-ext"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Obloga.ba Poslovanje",
    template: "%s · Obloga.ba",
  },
  description: "Stanje obloga, predračuni, prodaja i bilješke za Obloga.ba",
};

export const viewport: Viewport = {
  themeColor: "#311212",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="hr" className={`${nunitoSans.variable} ${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
