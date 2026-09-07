export const SAMPLE = "Sample";

export type Category = {
  id: string;
  name: string;
  short: string;
  description: string;
  image: string;
};

export type StockStatus = "in" | "limited" | "out";
export type PricingMode = "fixed" | "quote";

export type Product = {
  slug: string;
  categoryId: string;
  name: string;
  brand: string;
  unit: string;
  unitPrice: string;
  image: string;
  description: string;
  stock: StockStatus;
  pricingMode: PricingMode;
};

export type Stat = { value: string; label: string };
export type Testimonial = { name: string; role: string; company: string; quote: string };
export type Certification = { name: string; issuer: string; description: string };
export type Faq = { question: string; answer: string };

export const siteConfig = {
  name: "Banning Procurement Hub",
  tagline: "Your one-stop source for quality building materials across Ghana.",
  phoneDisplay: "055 885 0667",
  phoneIntl: "+233558850667",
  whatsappNumber: "233558850667",
  email: "banning173@gmail.com",
  address: "Office location shared on request. Serving all 16 regions of Ghana.",
  addressShort: "Accra, Ghana",
  hours: {
    summary: "Mon to Sat, 8am to 6pm",
    detail: "Monday to Saturday: 8:00am to 6:00pm. Sunday: by appointment.",
  },
  mapEmbedUrl: "https://maps.google.com/maps?q=Accra%2C%20Ghana&t=&z=12&ie=UTF8&iwloc=&output=embed",
  deliveryAreas: [
    "Greater Accra",
    "Ashanti",
    "Central",
    "Western",
    "Eastern",
    "Volta",
    "Ahafo",
    "Bono",
    "Bono East",
    "Oti",
    "Northern",
    "North East",
    "Savannah",
    "Upper East",
    "Upper West",
    "Western North",
  ],
  paymentMethods: ["Mobile Money", "Bank Transfer", "Cash on Delivery"],
  responsePromise: "Quotes within 24 hours",
  guarantee: "Every material is quality-checked before delivery. Replacements or refunds for genuine defects.",
};

export const stats: Stat[] = [
  { value: "1,200+", label: "Projects supplied" },
  { value: "9", label: "Material categories" },
  { value: "16", label: "Regions delivered" },
  { value: "Same day", label: "Faster deliveries in Accra" },
];

export const categories: Category[] = [
  {
    id: "cement",
    name: "Cement",
    short: "Every bag counted, every delivery verified.",
    description: "Quality cement brands for foundations, blocks and finishing, delivered bag-for-bag.",
    image: "/materials/cat-cement.jpg",
  },
  {
    id: "blocks",
    name: "Blocks",
    short: "Hollow and solid blocks, counted and delivered to your gate.",
    description: "Sandcrete hollow and solid blocks in the sizes your walling plan needs, counted block-for-block on delivery.",
    image: "/materials/cat-blocks.jpg",
  },
  {
    id: "iron-rods",
    name: "Iron Rods",
    short: "Structural steel cut, counted and delivered as specified.",
    description: "Reinforcement bars in the sizes and tonnages your structural plan requires.",
    image: "/materials/cat-iron-rods.jpg",
  },
  {
    id: "roofing",
    name: "Roofing Sheets",
    short: "Roofing sheets, nails and accessories in one order.",
    description: "Aluminium and long-span roofing sheets with the accessories to match.",
    image: "/materials/cat-roofing.jpg",
  },
  {
    id: "plumbing",
    name: "Plumbing",
    short: "PVC pipes, fittings and full bathroom rough-ins.",
    description: "Pipes, fittings, valves and accessories for complete plumbing installations.",
    image: "/materials/cat-plumbing.jpg",
  },
  {
    id: "electricals",
    name: "Electricals",
    short: "Cables, conduits, fittings and smart switches.",
    description: "Cable, conduit, sockets, switches and wiring accessories for safe installations.",
    image: "/materials/cat-electricals.jpg",
  },
  {
    id: "paint",
    name: "Paint",
    short: "Interior, exterior, primer and thinner for complete finishes.",
    description: "Emulsion, enamel, primer and thinners for interior and exterior finishing.",
    image: "/materials/cat-paint.jpg",
  },
  {
    id: "tiles",
    name: "Tiles",
    short: "Porcelain, ceramic and wall tiles for every room.",
    description: "Floor and wall tiles for homes, offices and commercial finishes.",
    image: "/materials/cat-tiles.jpg",
  },
  {
    id: "other",
    name: "Other Materials",
    short: "Everything else a site needs, from sand to tools.",
    description: "A catch-all for the rest of your list — sand, tools and site essentials.",
    image: "/materials/cat-other.jpg",
  },
];

export const products: Product[] = [
  { slug: "ghacem-supacem-42-5", categoryId: "cement", name: "Ghacem Super Cement 42.5R", brand: "GHACEM", unit: "bag (50kg)", unitPrice: "GH₵ 120", image: "/materials/ghacem-supacem-42-5.jpg", description: "General-purpose portland cement for blocks, foundations and slabs.", stock: "limited", pricingMode: "fixed" },
  { slug: "dangote-cement-42-5", categoryId: "cement", name: "Dangote Cement 42.5", brand: "Dangote", unit: "bag (50kg)", unitPrice: "GH₵ 118", image: "/materials/dangote-cement-42-5.jpg", description: "Consistent-setting portland cement, ideal for site work at scale.", stock: "in", pricingMode: "fixed" },
  { slug: "cestos-cement-32-5", categoryId: "cement", name: "CESTOS Cement 32.5", brand: "CESTOS", unit: "bag (50kg)", unitPrice: "GH₵ 110", image: "/materials/cestos-cement-32-5.jpg", description: "Value portland cement for render, screed and non-structural work.", stock: "in", pricingMode: "fixed" },
  { slug: "hollow-block-6-inch", categoryId: "blocks", name: "Hollow Block 6 inch", brand: "Sandcrete", unit: "block", unitPrice: "GH₵ 13", image: "/materials/hollow-block-6-inch.jpg", description: "Sandcrete hollow block for partitions and boundary walls.", stock: "in", pricingMode: "fixed" },
  { slug: "hollow-block-9-inch", categoryId: "blocks", name: "Hollow Block 9 inch", brand: "Sandcrete", unit: "block", unitPrice: "GH₵ 17", image: "/materials/hollow-block-9-inch.jpg", description: "Load-bearing sandcrete hollow block for main walls.", stock: "in", pricingMode: "fixed" },
  { slug: "sandcrete-solid-block", categoryId: "blocks", name: "Solid Block 6x9", brand: "Sandcrete", unit: "block", unitPrice: "GH₵ 19", image: "/materials/sandcrete-solid-block.jpg", description: "Solid sandcrete block where extra strength is needed.", stock: "limited", pricingMode: "fixed" },
  { slug: "deformed-bar-12mm", categoryId: "iron-rods", name: "Deformed Bar 12mm", brand: "Standard", unit: "piece (12m)", unitPrice: "GH₵ 95", image: "/materials/deformed-bar-12mm.jpg", description: "High-yield deformed bar for beams, columns and slabs.", stock: "in", pricingMode: "quote" },
  { slug: "deformed-bar-16mm", categoryId: "iron-rods", name: "Deformed Bar 16mm", brand: "Standard", unit: "piece (12m)", unitPrice: "GH₵ 168", image: "/materials/deformed-bar-16mm.jpg", description: "Heavy structural reinforcement for columns and transfer beams.", stock: "limited", pricingMode: "quote" },
  { slug: "binding-wire-roll", categoryId: "iron-rods", name: "Binding Wire", brand: "Standard", unit: "roll (3kg)", unitPrice: "GH₵ 55", image: "/materials/binding-wire-roll.jpg", description: "Soft iron binding wire for tying reinforcement cages.", stock: "in", pricingMode: "fixed" },
  { slug: "long-span-roofing-sheet", categoryId: "roofing", name: "Long-Span Roofing Sheet", brand: "Aluworks", unit: "sheet (6m)", unitPrice: "GH₵ 165", image: "/materials/long-span-roofing-sheet.jpg", description: "Zincalume long-span sheet with a 10-year warranty.", stock: "limited", pricingMode: "quote" },
  { slug: "roofing-roofmate-r", categoryId: "roofing", name: "Roofing Sheet Roofmate R", brand: "Roofmate", unit: "sheet (6m)", unitPrice: "GH₵ 175", image: "/materials/roofing-roofmate-r.jpg", description: "Popular corrugated profile for residential roofing.", stock: "in", pricingMode: "quote" },
  { slug: "roofing-nails-2kg", categoryId: "roofing", name: "Roofing Nails", brand: "Standard", unit: "pack (2kg)", unitPrice: "GH₵ 40", image: "/materials/roofing-nails-2kg.jpg", description: "Galvanised roofing nails with washers, roof-ready.", stock: "in", pricingMode: "fixed" },
  { slug: "pvc-pipe-6-inch", categoryId: "plumbing", name: "PVC Pipe 6 inch", brand: "Polytank/Javelin", unit: "piece (6m)", unitPrice: "GH₵ 145", image: "/materials/pvc-pipe-6-inch.jpg", description: "High-pressure PVC drainage pipe with sockets.", stock: "out", pricingMode: "fixed" },
  { slug: "pvc-pipe-1-5-inch", categoryId: "plumbing", name: "PVC Pipe 1.5 inch", brand: "Javelin", unit: "piece (6m)", unitPrice: "GH₵ 32", image: "/materials/pvc-pipe-1-5-inch.jpg", description: "Cold-water supply pipe, pressure rated.", stock: "in", pricingMode: "fixed" },
  { slug: "bathroom-faucet-set", categoryId: "plumbing", name: "Bathroom Faucet Set", brand: "Local/PBG", unit: "set", unitPrice: "GH₵ 220", image: "/materials/bathroom-faucet-set.jpg", description: "Complete basin, shower and sink mixer set.", stock: "limited", pricingMode: "fixed" },
  { slug: "electric-cable-2-5mm", categoryId: "electricals", name: "Electric Cable 2.5mm", brand: "CCA/Oman", unit: "roll (90m)", unitPrice: "GH₵ 260", image: "/materials/electric-cable-2-5mm.jpg", description: "Solid copper PVC cable for power circuits and sockets.", stock: "in", pricingMode: "fixed" },
  { slug: "surface-mount-socket", categoryId: "electricals", name: "Surface Mount Socket", brand: "Panasonic", unit: "piece", unitPrice: "GH₵ 45", image: "/materials/surface-mount-socket.jpg", description: "Double-pole power socket with plain cover.", stock: "in", pricingMode: "fixed" },
  { slug: "led-bulb-15w", categoryId: "electricals", name: "LED Bulb 15W", brand: "Philips", unit: "piece", unitPrice: "GH₵ 28", image: "/materials/led-bulb-15w.jpg", description: "Warm-white LED, long life, low energy.", stock: "out", pricingMode: "fixed" },
  { slug: "interior-emulsion-20l", categoryId: "paint", name: "Interior Emulsion 20L", brand: "Kansai", unit: "bucket (20L)", unitPrice: "GH₵ 320", image: "/materials/interior-emulsion-20l.jpg", description: "Washable interior emulsion, single pack.", stock: "in", pricingMode: "fixed" },
  { slug: "exterior-paint-20l", categoryId: "paint", name: "Exterior Paint 20L", brand: "Kansai", unit: "bucket (20L)", unitPrice: "GH₵ 360", image: "/materials/exterior-paint-20l.jpg", description: "Weather-resistant exterior emulsion or enamel.", stock: "limited", pricingMode: "fixed" },
  { slug: "paint-primer-20l", categoryId: "paint", name: "Primer 20L", brand: "Standard", unit: "bucket (20L)", unitPrice: "GH₵ 190", image: "/materials/paint-primer-20l.jpg", description: "Wall primer to seal surfaces before the top coat.", stock: "in", pricingMode: "fixed" },
  { slug: "paint-thinner-5l", categoryId: "paint", name: "Paint Thinner 5L", brand: "Standard", unit: "gallon (5L)", unitPrice: "GH₵ 95", image: "/materials/paint-thinner-5l.jpg", description: "For thinning and cleaning enamel surfaces.", stock: "in", pricingMode: "fixed" },
  { slug: "porcelain-floor-60x60", categoryId: "tiles", name: "Porcelain Floor 60x60", brand: "Twyford", unit: "box (4 pcs)", unitPrice: "GH₵ 210", image: "/materials/porcelain-floor-60x60.jpg", description: "Matte porcelain floor tile, low water absorption, heavy traffic.", stock: "in", pricingMode: "fixed" },
  { slug: "ceramic-wall-30x60", categoryId: "tiles", name: "Ceramic Wall 30x60", brand: "Twyford", unit: "box (6 pcs)", unitPrice: "GH₵ 160", image: "/materials/ceramic-wall-30x60.jpg", description: "Glazed ceramic wall tile for bathrooms and kitchens.", stock: "in", pricingMode: "fixed" },
  { slug: "porcelain-floor-80x80", categoryId: "tiles", name: "Porcelain Floor 80x80", brand: "Mosaic", unit: "box (3 pcs)", unitPrice: "GH₵ 290", image: "/materials/porcelain-floor-80x80.jpg", description: "Large-format polished porcelain for living spaces.", stock: "limited", pricingMode: "fixed" },
  { slug: "sharp-sand", categoryId: "other", name: "Sharp Sand", brand: "Local", unit: "trip (tipper)", unitPrice: "GH₵ 850", image: "/materials/sharp-sand.jpg", description: "Washed sharp sand for blockwork and plastering, priced by delivery distance.", stock: "in", pricingMode: "quote" },
  { slug: "wheelbarrow", categoryId: "other", name: "Wheelbarrow", brand: "Local", unit: "piece", unitPrice: "GH₵ 450", image: "/materials/wheelbarrow.jpg", description: "Heavy-duty single-wheel barrow for site use.", stock: "limited", pricingMode: "fixed" },
  { slug: "shovel-spade-set", categoryId: "other", name: "Shovel & Spade Set", brand: "Local", unit: "set", unitPrice: "GH₵ 180", image: "/materials/shovel-spade-set.jpg", description: "Basic digging and mixing tools for site work.", stock: "in", pricingMode: "fixed" },
];

export const testimonials: Testimonial[] = [
  { name: "Kwame A.", role: "Self-build contractor", company: "East Legon project", quote: "Rods came already cut to size and every bag of cement was counted on site. No arguments, no shortchanging." },
  { name: "Ama S.", role: "Site supervisor", company: "Madina, Accra", quote: "Ordered tiles and plumbing for a full block. Delivered in two days and the invoice matched the quote to the cedis." },
  { name: "Daniel O.", role: "Renovation client", company: "Tema", quote: "What capped it for me was the WhatsApp quote and delivery to my gate. Exactly what we agreed." },
];

export const certifications: Certification[] = [
  { name: "Registered business", issuer: "Government of Ghana", description: "Registered procurement and supply company operating under Ghanaian law." },
  { name: "Verified supplier network", issuer: "Ghana", description: "Materials sourced from authorised dealers and verified distributors only." },
  { name: "Fully insured deliveries", issuer: "Banning Procurement Hub", description: "Goods are insured in transit until signed for at your site." },
];

export const faqs: Faq[] = [
  { question: "How do I get a quote?", answer: "Add the materials you need to your quote, tell us your delivery area, and send it. We confirm pricing and delivery by WhatsApp or email within 24 hours." },
  { question: "What are your delivery areas?", answer: "We deliver across all 16 regions of Ghana, with same-day options in Greater Accra." },
  { question: "How do I pay?", answer: "Mobile money, bank transfer or cash on delivery. Payment terms are confirmed on your final invoice." },
  { question: "Can I order partial quantities?", answer: "Yes. Add any quantity you need; bags, pieces and rolls are sold individually." },
  { question: "What if the material is defective?", answer: "Every delivery is quality-checked first. Genuine defects are replaced or refunded per our guarantee." },
];

export function getCategory(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function productsByCategory(id: string): Product[] {
  return products.filter((p) => p.categoryId === id);
}
