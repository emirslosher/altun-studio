import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Altun Studio — Müziğin fikrinle başlasın",
  description:
    "Türk müziğinden ilham alan üretim stüdyosu. Fikrini şekillendir, tarzını seç ve ilk ses denemelerini keşfet.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
