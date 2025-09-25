export type SupplierOffer = {
  supplier?: string; // id
  pricePerUnit: number;
  lastUpdated?: string;
};

export type Supplier = {
  _id?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  rating?: number;
  materialsOffered?: { materialName: string; unit?: string; pricePerUnit: number; lastUpdated?: string }[];
  notes?: string;
};

export type Material = {
  _id?: string;
  name: string;
  category?: string;
  unit?: string;
  quantity?: number;
  minStock?: number;
  avgUnitCost?: number;
  lastUnitCost?: number;
  preferredSupplier?: string;
  supplierPrices?: SupplierOffer[];
  lowStock?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CostRow = {
  _id: string;
  name: string;
  unit: string;
  quantity: number;
  minStock: number;
  avgUnitCost: number;
  lastUnitCost: number;
  bestSupplierPrice: number | null;
  bestSupplierName: string | null;
  lowStock: boolean;
};
