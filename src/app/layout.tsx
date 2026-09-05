import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Banning Procurement Hub",
  description: "Ghana's #1 Procurement Hub for Construction. Cement, iron rods, tiles, roofing, plumbing and electrical materials delivered nationwide.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
