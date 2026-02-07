export type BusinessContext =
  | "exquisite_limo"
  | "xtreme_environmental"
  | "global_xtreme";

// Units for limo services
export type LimoUnit = "hrs" | "mile" | "flat";

// Service line item
export type LimoServiceLineItem = {
  id: string;
  serviceCategory: string;
  vehicleType: string;
  passengerCount: number;
  unit: LimoUnit;
  quantity: number;
  estimatedAmount: number;
};

// Add-on line item
export type LimoAddOnLineItem = {
  id: string;
  extraType: string;
  unit: LimoUnit;
  quantity: number;
  estimatedAmount: number;
};

// Quick Quote record (matches Supabase table)
export type QuickQuoteRecord = {
  id?: string;
  businessContext: BusinessContext;
  estimateType: "limo";
  services: LimoServiceLineItem[];
  addons: LimoAddOnLineItem[];
  total: number;
  notes?: string;

  // Required for PDF
  customer_name: string;
  service_type: string;
  created_at: string | Date;
};