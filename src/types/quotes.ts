export type BusinessContext =
  | "exquisite_limo"
  | "xtreme_environmental"
  | "global_xtreme";

export type LimoUnit = "hrs" | "mile" | "flat";

export type LimoServiceLineItem = {
  id: string;
  serviceCategory: string;
  vehicleType: string;
  passengerCount: number;
  unit: LimoUnit;
  quantity: number;
  estimatedAmount: number;
};

export type LimoAddOnLineItem = {
  id: string;
  extraType: string;
  unit: LimoUnit;
  quantity: number;
  estimatedAmount: number;
};

export type QuickQuoteRecord = {
  id?: string;
  businessContext: BusinessContext;
  estimateType: "limo";
  services: LimoServiceLineItem[];
  addons: LimoAddOnLineItem[];
  total: number;
  notes?: string;
};
