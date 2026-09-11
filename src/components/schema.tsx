import type { CatalogProduct } from "@/lib/catalog-types";

const SITE_URL = "https://banningprocurementhub.com";

function toAbsolute(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function availability(product: CatalogProduct): string {
  if (!product.trackInventory) return "https://schema.org/InStock";
  if (product.stockStatus === "out") return "https://schema.org/OutOfStock";
  if (product.stockStatus === "limited") return "https://schema.org/LimitedAvailability";
  return "https://schema.org/InStock";
}

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function BreadcrumbSchema({
  items,
}: {
  items: { name: string; href: string }[];
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: toAbsolute(item.href),
        })),
      }}
    />
  );
}

function productNode(product: CatalogProduct): Record<string, unknown> {
  const node: Record<string, unknown> = {
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.slug,
    brand: { "@type": "Brand", name: product.brand },
    image: toAbsolute(product.imageUrl ?? product.image),
  };
  if (product.pricingMode === "fixed") {
    const price = parseFloat(product.unitPrice.replace(/[^0-9.]/g, ""));
    if (Number.isFinite(price)) {
      node.offers = {
        "@type": "Offer",
        price,
        priceCurrency: "GHS",
        availability: availability(product),
        url: toAbsolute(`/products/${product.categoryId}/`),
      };
    }
  }
  return node;
}

export function ProductListSchema({ products }: { products: CatalogProduct[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "ItemList",
        itemListElement: products.map((product, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: productNode(product),
        })),
      }}
    />
  );
}

export function FaqSchema({
  faqs,
}: {
  faqs: { question: string; answer: string }[];
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      }}
    />
  );
}