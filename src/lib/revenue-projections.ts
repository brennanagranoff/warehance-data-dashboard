import { db } from "./db";

/**
 * Pricing tiers for shipments (same for all customers)
 * First 10,000 are included in the base fee
 */
const PRICING_TIERS = [
  { min: 0, max: 10000, rate: 0 },           // Included in base
  { min: 10001, max: 25000, rate: 0.05 },    // $0.05/shipment
  { min: 25001, max: 50000, rate: 0.045 },   // $0.045/shipment
  { min: 50001, max: 100000, rate: 0.0375 }, // $0.0375/shipment
  { min: 100001, max: 200000, rate: 0.03 },  // $0.03/shipment
  { min: 200001, max: 350000, rate: 0.025 }, // $0.025/shipment
  { min: 350001, max: Infinity, rate: 0.02 }, // $0.02/shipment
];

/**
 * Calculate overage cost for a given number of total shipments using tiered pricing
 */
export function calculateTieredOverage(totalShipments: number): number {
  let cost = 0;
  
  for (const tier of PRICING_TIERS) {
    if (totalShipments <= tier.min) break;
    
    const unitsInTier = Math.min(totalShipments, tier.max) - tier.min;
    if (unitsInTier > 0) {
      cost += unitsInTier * tier.rate;
    }
  }
  
  return cost;
}

export interface CustomerProjection {
  stripeCustomerId: string;
  customerName: string;
  
  // Current period info
  periodStart: Date;
  periodEnd: Date;
  daysInPeriod: number;
  daysPassed: number;
  daysRemaining: number;
  progressPercent: number;
  
  // Current amounts
  baseFee: number;
  currentOverageUnits: number;
  currentOverageAmount: number;
  currentTotal: number;
  
  // Pace-based projection (current usage extrapolated)
  paceProjectedUnits: number;
  paceProjectedOverage: number;
  paceProjectedTotal: number;
  dailyPace: number; // units per day at current rate
  
  // Historical average projection
  historicalAvgUnits: number;
  historicalAvgOverage: number;
  historicalProjectedTotal: number;
  historicalInvoiceCount: number;
  
  // Comparison indicators
  paceVsHistorical: "hot" | "cold" | "normal"; // running >20% above/below historical
  paceVsHistoricalPercent: number; // percentage difference
}

export interface DayBilling {
  date: Date;
  dateKey: string; // YYYY-MM-DD
  dayOfMonth: number;
  customers: {
    stripeCustomerId: string;
    customerName: string;
    baseFee: number;
    projectedOverage: number;
    projectedTotal: number;
  }[];
  totalAmount: number;
  customerCount: number;
}

export interface MonthProjection {
  month: string; // YYYY-MM
  monthName: string;
  daysInMonth: number;
  daysPassed: number;
  daysRemaining: number;
  progressPercent: number;
  
  // Current totals (what we have so far)
  currentBase: number;
  currentOverages: number;
  currentTotal: number;
  
  // Projected end of month
  projectedBase: number;
  projectedOverages: number;
  projectedTotal: number;
  
  // Daily calendar of billing events
  billingCalendar: DayBilling[];
  
  // Running totals for timeline view
  timeline: {
    date: Date;
    cumulativeBase: number;
    cumulativeOverages: number;
    cumulativeTotal: number;
    customersRemaining: number;
  }[];
  
  // All customer projections
  customers: CustomerProjection[];
}

/**
 * Get projection for a single customer based on current pace and historical average
 */
export async function getCustomerProjection(stripeCustomerId: string): Promise<CustomerProjection | null> {
  const [customer, unbilled, invoices] = await Promise.all([
    db.stripeCustomer.findUnique({
      where: { stripeCustomerId },
    }),
    db.unbilledSnapshot.findUnique({
      where: { stripeCustomerId },
    }),
    db.stripeInvoice.findMany({
      where: {
        stripeCustomerId,
        status: "paid",
      },
      orderBy: { periodEnd: "desc" },
      take: 6, // Last 6 invoices for historical average
    }),
  ]);

  if (!customer || !unbilled) return null;

  const now = new Date();
  const periodStart = unbilled.periodStart;
  const periodEnd = unbilled.periodEnd;
  
  // Calculate period progress
  const daysInPeriod = Math.max(1, Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)));
  const daysPassed = Math.max(1, Math.ceil((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(0, daysInPeriod - daysPassed);
  const progressPercent = Math.min(100, Math.round((daysPassed / daysInPeriod) * 100));

  // Current amounts from Stripe
  const baseFee = unbilled.baseFee;
  const currentOverageUnits = unbilled.overageUnits; // Total shipments reported by Stripe
  const currentOverageAmount = unbilled.overageAmount;
  const currentTotal = unbilled.totalBill;

  // Pace-based projection using tiered pricing
  // Calculate daily shipment pace and project to end of period
  const dailyPace = currentOverageUnits / daysPassed;
  const paceProjectedUnits = Math.round(dailyPace * daysInPeriod);
  
  // Use tiered pricing to calculate projected overage
  const paceProjectedOverage = calculateTieredOverage(paceProjectedUnits);
  const paceProjectedTotal = baseFee + paceProjectedOverage;

  // Historical average
  const historicalInvoiceCount = invoices.length;
  const historicalTotalUnits = invoices.reduce((sum, inv) => sum + inv.overageUnits, 0);
  
  const historicalAvgUnits = historicalInvoiceCount > 0 
    ? Math.round(historicalTotalUnits / historicalInvoiceCount) 
    : 0;
  // Use tiered pricing for historical projection
  const historicalAvgOverage = historicalInvoiceCount > 0 
    ? calculateTieredOverage(historicalAvgUnits)
    : 0;
  const historicalProjectedTotal = baseFee + historicalAvgOverage;

  // Compare pace to historical
  let paceVsHistorical: "hot" | "cold" | "normal" = "normal";
  let paceVsHistoricalPercent = 0;
  
  if (historicalAvgUnits > 0) {
    paceVsHistoricalPercent = ((paceProjectedUnits - historicalAvgUnits) / historicalAvgUnits) * 100;
    if (paceVsHistoricalPercent > 20) {
      paceVsHistorical = "hot";
    } else if (paceVsHistoricalPercent < -20) {
      paceVsHistorical = "cold";
    }
  }

  return {
    stripeCustomerId,
    customerName: unbilled.customerName,
    periodStart,
    periodEnd,
    daysInPeriod,
    daysPassed,
    daysRemaining,
    progressPercent,
    baseFee,
    currentOverageUnits,
    currentOverageAmount,
    currentTotal,
    paceProjectedUnits,
    paceProjectedOverage,
    paceProjectedTotal,
    dailyPace,
    historicalAvgUnits,
    historicalAvgOverage,
    historicalProjectedTotal,
    historicalInvoiceCount,
    paceVsHistorical,
    paceVsHistoricalPercent,
  };
}

/**
 * Get all customer projections for the next 30 days
 */
export async function getAllProjections(): Promise<CustomerProjection[]> {
  const unbilledSnapshots = await db.unbilledSnapshot.findMany({
    include: {
      stripeCustomer: {
        include: {
          invoices: {
            where: { status: "paid" },
            orderBy: { periodEnd: "desc" },
            take: 6,
          },
        },
      },
    },
  });

  const now = new Date();
  const projections: CustomerProjection[] = [];

  for (const unbilled of unbilledSnapshots) {
    const customer = unbilled.stripeCustomer;
    const invoices = customer.invoices;
    
    const periodStart = unbilled.periodStart;
    const periodEnd = unbilled.periodEnd;
    
    const daysInPeriod = Math.max(1, Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)));
    const daysPassed = Math.max(1, Math.ceil((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)));
    const daysRemaining = Math.max(0, daysInPeriod - daysPassed);
    const progressPercent = Math.min(100, Math.round((daysPassed / daysInPeriod) * 100));

    const baseFee = unbilled.baseFee;
    const currentOverageUnits = unbilled.overageUnits; // Total shipments from Stripe
    const currentOverageAmount = unbilled.overageAmount;
    const currentTotal = unbilled.totalBill;

    // Pace-based projection using tiered pricing
    const dailyPace = currentOverageUnits / daysPassed;
    const paceProjectedUnits = Math.round(dailyPace * daysInPeriod);
    // Use tiered pricing for accurate projection
    const paceProjectedOverage = calculateTieredOverage(paceProjectedUnits);
    const paceProjectedTotal = baseFee + paceProjectedOverage;

    // Historical average
    const historicalInvoiceCount = invoices.length;
    const historicalTotalUnits = invoices.reduce((sum, inv) => sum + inv.overageUnits, 0);
    const historicalTotalOverages = invoices.reduce((sum, inv) => sum + inv.overageAmount, 0);
    
    const historicalAvgUnits = historicalInvoiceCount > 0 
      ? Math.round(historicalTotalUnits / historicalInvoiceCount) 
      : 0;
    // Use tiered pricing for historical projection too
    const historicalAvgOverage = historicalInvoiceCount > 0 
      ? calculateTieredOverage(historicalAvgUnits)
      : 0;
    const historicalProjectedTotal = baseFee + historicalAvgOverage;

    // Compare pace to historical
    let paceVsHistorical: "hot" | "cold" | "normal" = "normal";
    let paceVsHistoricalPercent = 0;
    
    if (historicalAvgUnits > 0) {
      paceVsHistoricalPercent = ((paceProjectedUnits - historicalAvgUnits) / historicalAvgUnits) * 100;
      if (paceVsHistoricalPercent > 20) {
        paceVsHistorical = "hot";
      } else if (paceVsHistoricalPercent < -20) {
        paceVsHistorical = "cold";
      }
    }

    projections.push({
      stripeCustomerId: unbilled.stripeCustomerId,
      customerName: unbilled.customerName,
      periodStart,
      periodEnd,
      daysInPeriod,
      daysPassed,
      daysRemaining,
      progressPercent,
      baseFee,
      currentOverageUnits,
      currentOverageAmount,
      currentTotal,
      paceProjectedUnits,
      paceProjectedOverage,
      paceProjectedTotal,
      dailyPace,
      historicalAvgUnits,
      historicalAvgOverage,
      historicalProjectedTotal,
      historicalInvoiceCount,
      paceVsHistorical,
      paceVsHistoricalPercent,
    });
  }

  return projections.sort((a, b) => a.periodEnd.getTime() - b.periodEnd.getTime());
}

/**
 * Build a 30-day calendar of when bills will hit
 */
export async function getBillingCalendar(daysAhead: number = 30): Promise<DayBilling[]> {
  const projections = await getAllProjections();
  const now = new Date();
  const endDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  // Create a map of dates to billing events
  const calendar: Map<string, DayBilling> = new Map();

  for (const proj of projections) {
    // Only include if billing date is within our window
    if (proj.periodEnd < now || proj.periodEnd > endDate) continue;

    const dateKey = proj.periodEnd.toISOString().slice(0, 10);
    
    if (!calendar.has(dateKey)) {
      calendar.set(dateKey, {
        date: new Date(dateKey),
        dateKey,
        dayOfMonth: proj.periodEnd.getDate(),
        customers: [],
        totalAmount: 0,
        customerCount: 0,
      });
    }

    const day = calendar.get(dateKey)!;
    day.customers.push({
      stripeCustomerId: proj.stripeCustomerId,
      customerName: proj.customerName,
      baseFee: proj.baseFee,
      projectedOverage: proj.paceProjectedOverage,
      projectedTotal: proj.paceProjectedTotal,
    });
    day.totalAmount += proj.paceProjectedTotal;
    day.customerCount += 1;
  }

  // Sort by date
  return Array.from(calendar.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Get complete month projection with calendar and timeline
 */
export async function getMonthProjection(month?: string): Promise<MonthProjection> {
  const now = new Date();
  const targetMonth = month || now.toISOString().slice(0, 7);
  
  // Parse month
  const [year, monthNum] = targetMonth.split("-").map(Number);
  const monthStart = new Date(year, monthNum - 1, 1);
  const monthEnd = new Date(year, monthNum, 0); // Last day of month
  
  const daysInMonth = monthEnd.getDate();
  const daysPassed = targetMonth === now.toISOString().slice(0, 7) 
    ? now.getDate() 
    : (now > monthEnd ? daysInMonth : 0);
  const daysRemaining = daysInMonth - daysPassed;
  const progressPercent = Math.round((daysPassed / daysInMonth) * 100);

  const monthName = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Get all projections
  const allProjections = await getAllProjections();
  
  // Filter to customers billing in this month
  const monthCustomers = allProjections.filter(p => {
    const billingMonth = p.periodEnd.toISOString().slice(0, 7);
    return billingMonth === targetMonth;
  });

  // Current totals
  const currentBase = monthCustomers.reduce((sum, c) => sum + c.baseFee, 0);
  const currentOverages = monthCustomers.reduce((sum, c) => sum + c.currentOverageAmount, 0);
  const currentTotal = monthCustomers.reduce((sum, c) => sum + c.currentTotal, 0);

  // Projected totals
  const projectedBase = currentBase; // Base doesn't change
  const projectedOverages = monthCustomers.reduce((sum, c) => sum + c.paceProjectedOverage, 0);
  const projectedTotal = projectedBase + projectedOverages;

  // Build calendar for this month
  const billingCalendar: DayBilling[] = [];
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, monthNum - 1, day);
    const dateKey = date.toISOString().slice(0, 10);
    
    const dayCustomers = monthCustomers.filter(c => 
      c.periodEnd.toISOString().slice(0, 10) === dateKey
    );

    if (dayCustomers.length > 0) {
      billingCalendar.push({
        date,
        dateKey,
        dayOfMonth: day,
        customers: dayCustomers.map(c => ({
          stripeCustomerId: c.stripeCustomerId,
          customerName: c.customerName,
          baseFee: c.baseFee,
          projectedOverage: c.paceProjectedOverage,
          projectedTotal: c.paceProjectedTotal,
        })),
        totalAmount: dayCustomers.reduce((sum, c) => sum + c.paceProjectedTotal, 0),
        customerCount: dayCustomers.length,
      });
    }
  }

  // Build timeline with running totals
  let cumulativeBase = 0;
  let cumulativeOverages = 0;
  let cumulativeTotal = 0;
  let customersRemaining = monthCustomers.length;

  const timeline = billingCalendar.map(day => {
    cumulativeBase += day.customers.reduce((sum, c) => sum + c.baseFee, 0);
    cumulativeOverages += day.customers.reduce((sum, c) => sum + c.projectedOverage, 0);
    cumulativeTotal += day.totalAmount;
    customersRemaining -= day.customerCount;

    return {
      date: day.date,
      cumulativeBase,
      cumulativeOverages,
      cumulativeTotal,
      customersRemaining,
    };
  });

  return {
    month: targetMonth,
    monthName,
    daysInMonth,
    daysPassed,
    daysRemaining,
    progressPercent,
    currentBase,
    currentOverages,
    currentTotal,
    projectedBase,
    projectedOverages,
    projectedTotal,
    billingCalendar,
    timeline,
    customers: monthCustomers,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format currency with cents
 */
export function formatCurrencyExact(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

