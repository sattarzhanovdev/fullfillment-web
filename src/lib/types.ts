export interface Client {
  id: string;
  name: string;
  type: "IP" | "OOO";
  status: "ACTIVE" | "BLOCKED" | "ARCHIVED";
  debtLimit: string;
  bufferPercent: string | null;
  manager: { id: string; fullName: string } | null;
  productsCount?: number;
  ordersCount?: number;
  debt?: number;
  createdAt: string;
}

export interface Product {
  id: string;
  clientId: string;
  name: string;
  sku: string;
  article: string;
  barcode: string;
  category: string | null;
  photoUrl: string | null;
  lengthCm: string | null;
  widthCm: string | null;
  heightCm: string | null;
  weightKg: string | null;
  ownPrice: string | null;
  fbsProcessingPrice: string | null;
  bufferPercent: string | null;
  isActive: boolean;
  volumeLiters: number | null;
  client?: { id: string; name: string };
  packagingType?: { id: string; name: string } | null;
  createdAt: string;
}
