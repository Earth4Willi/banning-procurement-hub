/**
 * Curated list of building/construction material brands supplied across
 * Africa, grouped by material so the admin product form can offer a select
 * dropdown. It is a living list - add brands as you encounter them.
 *
 * The DB stores brand as free text, so selecting a brand here (or using the
 * "Other" option) just records that exact string.
 */

export type BrandGroup = {
  label: string;
  brands: string[];
};

export const AFRICAN_CONSTRUCTION_BRAND_GROUPS: BrandGroup[] = [
  {
    label: "Cement",
    brands: [
      "BUA Cement",
      "CIMAF",
      "Dangote Cement",
      "Diamond Cement",
      "Ghacem",
      "InterCement",
      "Lafarge",
      "PPC Cement",
      "Rhinoceros Cement",
      "Simba Cement",
      "Supacem",
      "Tembo Cement",
      "Twiga Cement",
    ],
  },
  {
    label: "Roofing & Steel Sheets",
    brands: [
      "Ashfoam",
      "Avi Roofing",
      "Cador",
      "Crown Stamping",
      "Innovative Roofing Systems",
      "Laweza",
      "Long Span",
      "Mabati Rolling Mills",
      "Metal Roofing",
      "Onduline",
      "Regal",
      "Safal Steel",
      "Tegola",
    ],
  },
  {
    label: "Tiles & Ceramics",
    brands: [
      "Ceramica",
      "Frost Tiles",
      "HR Vulcano",
      "Jouka",
      "Klybeck",
      "Nobel Ceramic",
      "Sidi Ali",
      "Soso",
      "Venis",
      "Villa Ceramics",
    ],
  },
  {
    label: "Plumbing & Water Storage",
    brands: [
      "Duraplast",
      "Emte",
      "Geberit",
      "Hawking",
      "Jojo Tanks",
      "Kentank",
      "Rotoplas",
      "Sintex",
      "Wavin",
    ],
  },
  {
    label: "Electrical",
    brands: [
      "Aero",
      "Blake Electrical",
      "Dustine",
      "Grover",
      "Lexcom",
      "Megatron",
      "Philips",
      "Schneider Electric",
    ],
  },
  {
    label: "Paint & Coatings",
    brands: [
      "Aero Paints",
      "Crown Paints",
      "Dulux",
      "Kansai Plascon",
      "Nippon Paint",
      "Ritecrete",
      "Sadolin",
      "Summit Paints",
    ],
  },
  {
    label: "Steel & Iron",
    brands: [
      "ArcelorMittal",
      "Hyundai Steel",
      "JSW Steel",
      "Rida Tono",
      "Scaw",
      "Sentra",
      "Tru-T",
      "Zhong Xin",
    ],
  },
  {
    label: "Doors, Timber & Other",
    brands: [
      "Berger",
      "MG Doors",
      "Multikwik",
      "Norsk",
      "PlyPol",
      "Sika",
      "Solignum",
    ],
  },
];

/** Sentinel option that reveals a free-text input for a brand not listed. */
export const OTHER_BRAND = "Other (specify below)";

/** Flat list of selectable brand names, alphabetized, plus the sentinel last. */
export const ALL_BRAND_OPTIONS: string[] = [
  ...AFRICAN_CONSTRUCTION_BRAND_GROUPS.flatMap((group) => group.brands).sort((a, b) => a.localeCompare(b)),
  OTHER_BRAND,
];

export const isOtherBrand = (brand: string): boolean => brand === OTHER_BRAND;