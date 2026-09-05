export const SAMPLE = "Sample";

export type Category = {
  id: string;
  name: string;
  short: string;
  description: string;
  image: string;
};

export type Product = {
  slug: string;
  categoryId: string;
  name: string;
  brand: string;
  unit: string;
  unitPrice: string;
  image: string;
  description: string;
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
  email: "hello@banningprocurementhub.com",
  address: "Office location shared on request. Serving all 16 regions of Ghana.",
  addressShort: "Accra, Ghana",
  hours: {
    summary: "Mon to Sat, 8am to 6pm",
    detail: "Monday to Saturday: 8:00am to 6:00pm. Sunday: by appointment.",
  },
  mapEmbedUrl: "https://maps.google.com/maps?q=Accra%2C%20Ghana&t=&z=12&ie=UTF8&iwloc=&output=embed",
  deliveryAreas: ["Greater Accra", "Ashanti", "Central", "Western", "Eastern", "Volta", "Nationwide"],
  paymentMethods: ["Mobile Money", "Bank Transfer", "Cash on Delivery"],
  responsePromise: "Quotes within 24 hours",
  guarantee: "Every material is quality-checked before delivery. Replacements or refunds for genuine defects.",
};

export const stats: Stat[] = [
  { value: "1,200+", label: "Projects supplied" },
  { value: "6", label: "Material categories" },
  { value: "16", label: "Regions delivered" },
  { value: "Same day", label: "Faster deliveries in Accra" },
];

export const categories: Category[] = [
  {
    id: "cement",
    name: "Cement",
    short: "Every bag counted, every delivery verified.",
    description: "Quality cement brands for foundations, blocks and finishing, delivered bag-for-bag.",
    image: "https://picsum.photos/seed/bph-cement/900/700",
  },
  {
    id: "iron-rods",
    name: "Iron Rods",
    short: "Structural steel cut, counted and delivered as specified.",
    description: "Reinforcement bars in the sizes and tonnages your structural plan requires.",
    image: "https://picsum.photos/seed/bph-iron/900/700",
  },
  {
    id: "tiles",
    name: "Tiles",
    short: "Porcelain, ceramic and wall tiles for every room.",
    description: "Floor and wall tiles for homes, offices and commercial finishes.",
    image: "https://picsum.photos/seed/bph-tiles/900/700",
  },
  {
    id: "roofing",
    name: "Roofing Sheets",
    short: "Roofing sheets, nails and accessories in one order.",
    description: "Aluminium and long-span roofing sheets with the accessories to match.",
    image: "https://picsum.photos/seed/bph-roofing/900/700",
  },
  {
    id: "plumbing",
    name: "Plumbing",
    short: "PVC pipes, fittings and full bathroom rough-ins.",
    description: "Pipes, fittings, valves and accessories for complete plumbing installations.",
    image: "https://picsum.photos/seed/bph-plumbing/900/700",
  },
  {
    id: "electricals",
    name: "Electricals",
    short: "Cables, conduits, fittings and smart switches.",
    description: "Cable, conduit, sockets, switches and wiring accessories for safe installations.",
    image: "https://picsum.photos/seed/bph-electricals/900/700",
  },
];

export const products: Product[] = [
  { slug: "ghacem-supacem-42-5", categoryId: "cement", name: "Ghacem Super Cement 42.5R", brand: "GHACEM", unit: "bag (50kg)", unitPrice: "GH₵ 120", image: "https://picsum.photos/seed/bph-p-cement1/900/700", description: "General-purpose portland cement for blocks, foundations and slabs." },
  { slug: "dangote-cement-42-5", categoryId: "cement", name: "Dangote Cement 42.5", brand: "Dangote", unit: "bag (50kg)", unitPrice: "GH₵ 118", image: "https://picsum.photos/seed/bph-p-cement2/900/700", description: "Consistent-setting portland cement, ideal for site work at scale." },
  { slug: "cestos-cement-32-5", categoryId: "cement", name: "CESTOS Cement 32.5", brand: "CESTOS", unit: "bag (50kg)", unitPrice: "GH₵ 110", image: "https://picsum.photos/seed/bph-p-cement3/900/700", description: "Value portland cement for render, screed and non-structural work." },
  { slug: "deformed-bar-12mm", categoryId: "iron-rods", name: "Deformed Bar 12mm", brand: "Standard", unit: "piece (12m)", unitPrice: "GH₵ 95", image: "https://picsum.photos/seed/bph-p-iron1/900/700", description: "High-yield deformed bar for beams, columns and slabs." },
  { slug: "deformed-bar-16mm", categoryId: "iron-rods", name: "Deformed Bar 16mm", brand: "Standard", unit: "piece (12m)", unitPrice: "GH₵ 168", image: "https://picsum.photos/seed/bph-p-iron2/900/700", description: "Heavy structural reinforcement for columns and transfer beams." },
  { slug: "binding-wire-roll", categoryId: "iron-rods", name: "Binding Wire", brand: "Standard", unit: "roll (3kg)", unitPrice: "GH₵ 55", image: "https://picsum.photos/seed/bph-p-iron3/900/700", description: "Soft iron binding wire for tying reinforcement cages." },
  { slug: "porcelain-floor-60x60", categoryId: "tiles", name: "Porcelain Floor 60x60", brand: "Twyford", unit: "box (4 pcs)", unitPrice: "GH₵ 210", image: "https://picsum.photos/seed/bph-p-tile1/900/700", description: "Matte porcelain floor tile, low water absorption, heavy traffic." },
  { slug: "ceramic-wall-30x60", categoryId: "tiles", name: "Ceramic Wall 30x60", brand: "Twyford", unit: "box (6 pcs)", unitPrice: "GH₵ 160", image: "https://picsum.photos/seed/bph-p-tile2/900/700", description: "Glazed ceramic wall tile for bathrooms and kitchens." },
  { slug: "porcelain-floor-80x80", categoryId: "tiles", name: "Porcelain Floor 80x80", brand: "Mosaic", unit: "box (3 pcs)", unitPrice: "GH₵ 290", image: "https://picsum.photos/seed/bph-p-tile3/900/700", description: "Large-format polished porcelain for living spaces." },
  { slug: "long-span-roofing-sheet", categoryId: "roofing", name: "Long-Span Roofing Sheet", brand: "Aluworks", unit: "sheet (6m)", unitPrice: "GH₵ 165", image: "https://picsum.photos/seed/bph-p-roof1/900/700", description: "Zincalume long-span sheet with a 10-year warranty." },
  { slug: "roofing-roofmate-r", categoryId: "roofing", name: "Roofing Sheet Roofmate R", brand: "Roofmate", unit: "sheet (6m)", unitPrice: "GH₵ 175", image: "https://picsum.photos/seed/bph-p-roof2/900/700", description: "Popular corrugated profile for residential roofing." },
  { slug: "roofing-nails-2kg", categoryId: "roofing", name: "Roofing Nails", brand: "Standard", unit: "pack (2kg)", unitPrice: "GH₵ 40", image: "https://picsum.photos/seed/bph-p-roof3/900/700", description: "Galvanised roofing nails with washers, roof-ready." },
  { slug: "pvc-pipe-6-inch", categoryId: "plumbing", name: "PVC Pipe 6 inch", brand: "Polytank/Javelin", unit: "piece (6m)", unitPrice: "GH₵ 145", image: "https://picsum.photos/seed/bph-p-plumb1/900/700", description: "High-pressure PVC drainage pipe with sockets." },
  { slug: "pvc-pipe-1-5-inch", categoryId: "plumbing", name: "PVC Pipe 1.5 inch", brand: "Javelin", unit: "piece (6m)", unitPrice: "GH₵ 32", image: "https://picsum.photos/seed/bph-p-plumb2/900/700", description: "Cold-water supply pipe, pressure rated." },
  { slug: "bathroom-faucet-set", categoryId: "plumbing", name: "Bathroom Faucet Set", brand: "Local/PBG", unit: "set", unitPrice: "GH₵ 220", image: "https://picsum.photos/seed/bph-p-plumb3/900/700", description: "Complete basin, shower and sink mixer set." },
  { slug: "electric-cable-2-5mm", categoryId: "electricals", name: "Electric Cable 2.5mm", brand: "CCA/Oman", unit: "roll (90m)", unitPrice: "GH₵ 260", image: "https://picsum.photos/seed/bph-p-elec1/900/700", description: "Solid copper PVC cable for power circuits and sockets." },
  { slug: "surface-mount-socket", categoryId: "electricals", name: "Surface Mount Socket", brand: "Panasonic", unit: "piece", unitPrice: "GH₵ 45", image: "https://picsum.photos/seed/bph-p-elec2/900/700", description: "Double-pole power socket with plain cover." },
  { slug: "led-bulb-15w", categoryId: "electricals", name: "LED Bulb 15W", brand: "Philips", unit: "piece", unitPrice: "GH₵ 28", image: "https://picsum.photos/seed/bph-p-elec3/900/700", description: "Warm-white LED, long life, low energy." },
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
  { question: "How do I get a quote?", answer: "Add the materials you need to your quote, tell us your delivery area, and send it on WhatsApp. We confirm pricing and delivery within 24 hours." },
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
