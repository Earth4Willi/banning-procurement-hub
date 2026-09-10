export type StockStatus = "in" | "limited" | "out";
export type PricingMode = "fixed" | "quote";
export type ProductKind = "unit" | "measure";
export type QuoteSource = "web" | "whatsapp" | "contact";

export type CatalogCategory = {
  id: string;
  name: string;
  short: string;
  description: string;
  image: string;
  imageUrl?: string;
  sortOrder?: number;
  visible?: boolean;
};

export type CatalogProduct = {
  slug: string;
  categoryId: string;
  name: string;
  brand: string;
  unit: string;
  unitPrice: string;
  image: string;
  imageUrl?: string;
  description: string;
  stockQuantity: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  stockStatus: StockStatus;
  pricingMode: PricingMode;
  kind: ProductKind;
  visible?: boolean;
  sortOrder?: number;
};

export type MessageRecord = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  area: string;
  message: string;
  read: boolean;
  created_at: string;
};

export type CustomerRecord = {
  phone: string;
  name: string;
  email: string | null;
  notes: string;
  status: string;
  requestCount: number;
  lastContactAt: string | null;
  bestStatus: string | null;
  sources: string[];
  createdAt: string;
  updatedAt: string;
};