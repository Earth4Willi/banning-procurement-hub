import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Manrope, Outfit } from "next/font/google";
import "./globals.css";
import { QuoteProvider } from "@/lib/quote-context";
import { GoogleAnalytics } from "@/components/ga";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Banning Procurement Hub", template: "%s | Banning Procurement Hub" },
  description: "Ghana's #1 Procurement Hub for Construction. Bulk cement, iron rods, tiles, roofing, plumbing and electrical materials delivered nationwide.",
  metadataBase: new URL("https://banningprocurementhub.com"),
  openGraph: {
    type: "website",
    locale: "en_GH",
    siteName: "Banning Procurement Hub",
    title: "Banning Procurement Hub",
    description: "Ghana's #1 Procurement Hub for Construction. Bulk cement, iron rods, tiles, roofing, plumbing and electrical materials delivered nationwide.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Banning Procurement Hub" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Banning Procurement Hub",
    description: "Ghana's #1 Procurement Hub for Construction. Bulk cement, iron rods, tiles, roofing, plumbing and electrical materials delivered nationwide.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0d3d1a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${outfit.variable} ${manrope.variable} ${jetbrains.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.dataset.theme=localStorage.getItem("bph-theme")||(matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light")}catch(e){}`,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="font-body antialiased"
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[10px] focus:bg-accent focus:px-4 focus:py-2 focus:text-ink"
        >
          Skip to content
        </a>
        <QuoteProvider>
          {children}
        </QuoteProvider>
        <GoogleAnalytics />
      </body>
    </html>
  );
}
