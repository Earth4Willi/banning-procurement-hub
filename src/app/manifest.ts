import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Banning Procurement Hub",
    short_name: "BPH",
    description: "Ghana's #1 Procurement Hub for Construction. Bulk cement, iron rods, tiles, roofing, plumbing and electrical materials delivered nationwide.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF8F3",
    theme_color: "#0d3d1a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
