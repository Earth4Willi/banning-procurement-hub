import { siteConfig } from "@/lib/site";

export function OrganizationSchema() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: siteConfig.name,
    description: "Construction and real-estate procurement: cement, iron rods, tiles, roofing, plumbing and electricals.",
    telephone: siteConfig.phoneIntl,
    email: "",
    address: { "@type": "PostalAddress", addressLocality: "Accra", addressCountry: "GH" },
    areaServed: "Ghana",
    openingHours: "Mo-Sa 08:00-18:00",
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}