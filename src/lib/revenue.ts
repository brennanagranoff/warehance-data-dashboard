import { format, addMonths, startOfMonth } from "date-fns";

export interface PricingData {
  baseFee: number;
  includedShipments: number;
  overageRate: number;
  labelFeeEnabled: boolean;
  labelFeeRate: number;
  labelFeePercentage: number;
}

export interface RevenueCalculation {
  baseFee: number;
  overageRevenue: number;
  labelRevenue: number;
  totalRevenue: number;
  estimatedShipments: number;
  labelFeePercentage: number;
}

export function calculateTieredOverage(
  shipments: number,
  includedShipments: number,
  overageRate: number
): number {
  const overageShipments = Math.max(0, shipments - includedShipments);
  return overageShipments * overageRate;
}

export function calculateCustomerRevenue(
  pricing: PricingData,
  estimatedShipments: number
): RevenueCalculation {
  const baseFee = pricing.baseFee;
  const overageRevenue = calculateTieredOverage(
    estimatedShipments,
    pricing.includedShipments,
    pricing.overageRate
  );
  const labelRevenue = pricing.labelFeeEnabled
    ? estimatedShipments * pricing.labelFeeRate * pricing.labelFeePercentage
    : 0;
  const totalRevenue = baseFee + overageRevenue + labelRevenue;

  return {
    baseFee,
    overageRevenue,
    labelRevenue,
    totalRevenue,
    estimatedShipments,
    labelFeePercentage: pricing.labelFeePercentage,
  };
}

export function isCustomerActiveForMonth(
  status: string,
  startDate: Date | null,
  month: string
): boolean {
  if (status === "Inactive") return false;
  
  if (startDate) {
    const monthDate = new Date(month + "-01");
    const customerStart = startOfMonth(startDate);
    if (monthDate < customerStart) return false;
  }
  
  return true;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyDetailed(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getMonthOptions(count: number = 4): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const date = addMonths(startOfMonth(now), i);
    const value = format(date, "yyyy-MM");
    const label = format(date, "MMMM yyyy");
    options.push({ value, label });
  }
  
  return options;
}

export function getCurrentMonth(): string {
  return format(new Date(), "yyyy-MM");
}

