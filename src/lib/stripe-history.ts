import { stripe } from "./stripe";
import { db } from "./db";
import Stripe from "stripe";

/**
 * Sync all historical invoices from Stripe (all time)
 */
export async function syncAllInvoices(): Promise<{
  total: number;
  created: number;
  updated: number;
}> {
  let total = 0;
  let created = 0;
  let updated = 0;
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const invoices = await stripe.invoices.list({
      limit: 100,
      starting_after: startingAfter,
      expand: ["data.subscription"],
    });

    for (const invoice of invoices.data) {
      // Skip invoices without a customer
      if (!invoice.customer || typeof invoice.customer !== "string") continue;

      // Check if this customer exists in our StripeCustomer table
      const stripeCustomer = await db.stripeCustomer.findUnique({
        where: { stripeCustomerId: invoice.customer },
      });

      if (!stripeCustomer) continue;

      // Calculate base vs overage amounts from line items
      let baseAmount = 0;
      let overageAmount = 0;
      let overageUnits = 0;

      for (const line of invoice.lines?.data || []) {
        // Identify metered items by quantity > 1 (usage-based billing)
        // Subscription base fees typically have quantity = 1 or null
        const isMetered = line.quantity != null && line.quantity > 1;
        
        if (isMetered) {
          overageAmount += line.amount / 100;
          overageUnits += line.quantity || 0;
        } else {
          baseAmount += line.amount / 100;
        }
      }

      const invoiceData = {
        stripeCustomerId: invoice.customer,
        periodStart: new Date((invoice.period_start || invoice.created) * 1000),
        periodEnd: new Date((invoice.period_end || invoice.created) * 1000),
        status: invoice.status || "unknown",
        subtotal: (invoice.subtotal || 0) / 100,
        total: (invoice.total || 0) / 100,
        amountPaid: (invoice.amount_paid || 0) / 100,
        baseAmount,
        overageAmount,
        overageUnits,
        invoiceDate: new Date(invoice.created * 1000),
        paidAt: invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000)
          : null,
      };

      // Upsert invoice
      const existing = await db.stripeInvoice.findUnique({
        where: { stripeInvoiceId: invoice.id },
      });

      if (existing) {
        await db.stripeInvoice.update({
          where: { stripeInvoiceId: invoice.id },
          data: invoiceData,
        });
        updated++;
      } else {
        await db.stripeInvoice.create({
          data: {
            stripeInvoiceId: invoice.id,
            ...invoiceData,
          },
        });
        created++;
      }
      total++;
    }

    hasMore = invoices.has_more;
    if (invoices.data.length > 0) {
      startingAfter = invoices.data[invoices.data.length - 1].id;
    }
  }

  return { total, created, updated };
}

/**
 * Sync unbilled amounts from Stripe to local database
 */
export async function syncUnbilledAmounts(): Promise<{
  synced: number;
  errors: number;
}> {
  let synced = 0;
  let errors = 0;

  // Fetch both active AND trialing subscriptions
  const [activeSubs, trialingSubs] = await Promise.all([
    stripe.subscriptions.list({
      status: "active",
      limit: 100,
      expand: ["data.customer"],
    }),
    stripe.subscriptions.list({
      status: "trialing",
      limit: 100,
      expand: ["data.customer"],
    }),
  ]);
  
  const subscriptions = {
    data: [...activeSubs.data, ...trialingSubs.data],
  };

  for (const sub of subscriptions.data) {
    const customer = sub.customer as Stripe.Customer;
    
    try {
      const preview = await stripe.invoices.createPreview({
        customer: customer.id,
        subscription: sub.id,
      });

      let baseFee = 0;
      let overageAmount = 0;
      let overageUnits = 0;

      for (const line of preview.lines.data) {
        // Identify metered items by quantity > 1 (usage-based billing)
        const isMetered = line.quantity != null && line.quantity > 1;
        
        if (isMetered) {
          overageAmount += line.amount / 100;
          overageUnits += line.quantity || 0;
        } else {
          baseFee += line.amount / 100;
        }
      }

      // Get period info from the invoice preview
      const periodStart = new Date((preview.period_start || preview.created) * 1000);
      const periodEnd = new Date((preview.period_end || preview.created) * 1000);
      const daysLeft = Math.ceil((periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      const customerName = customer.name || customer.email || "Unknown";

      // Upsert to database
      await db.unbilledSnapshot.upsert({
        where: { stripeCustomerId: customer.id },
        update: {
          customerName,
          periodStart,
          periodEnd,
          daysLeft,
          baseFee,
          overageUnits,
          overageAmount,
          totalBill: preview.total / 100,
          lastSyncedAt: new Date(),
        },
        create: {
          stripeCustomerId: customer.id,
          customerName,
          periodStart,
          periodEnd,
          daysLeft,
          baseFee,
          overageUnits,
          overageAmount,
          totalBill: preview.total / 100,
        },
      });

      synced++;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to sync unbilled for ${customer.name || customer.email}:`, message);
      errors++;
    }
  }

  return { synced, errors };
}

/**
 * Get unbilled amounts from local database (fast, no Stripe API calls)
 */
export async function getUnbilledAmounts(): Promise<{
  customers: {
    stripeCustomerId: string;
    name: string;
    baseFee: number;
    overageAmount: number;
    overageUnits: number;
    totalBill: number;
    periodEnd: Date;
    daysLeft: number;
  }[];
  totalBase: number;
  totalOverages: number;
  totalBill: number;
  lastSyncedAt: Date | null;
}> {
  const snapshots = await db.unbilledSnapshot.findMany({
    orderBy: { overageAmount: "desc" },
  });

  const customers = snapshots.map((s) => ({
    stripeCustomerId: s.stripeCustomerId,
    name: s.customerName,
    baseFee: s.baseFee,
    overageAmount: s.overageAmount,
    overageUnits: s.overageUnits,
    totalBill: s.totalBill,
    periodEnd: s.periodEnd,
    daysLeft: s.daysLeft,
  }));

  // Recalculate daysLeft based on current time
  const now = Date.now();
  for (const c of customers) {
    c.daysLeft = Math.ceil((c.periodEnd.getTime() - now) / (1000 * 60 * 60 * 24));
  }

  const lastSyncedAt = snapshots.length > 0 ? snapshots[0].lastSyncedAt : null;

  return {
    customers,
    totalBase: customers.reduce((sum, c) => sum + c.baseFee, 0),
    totalOverages: customers.reduce((sum, c) => sum + c.overageAmount, 0),
    totalBill: customers.reduce((sum, c) => sum + c.totalBill, 0),
    lastSyncedAt,
  };
}

/**
 * Force refresh unbilled amounts from Stripe (for manual refresh button)
 */
export async function refreshUnbilledAmounts() {
  await syncUnbilledAmounts();
  return getUnbilledAmounts();
}

/**
 * Get historical revenue data grouped by month
 */
export async function getRevenueHistory(months: number = 12) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  const invoices = await db.stripeInvoice.findMany({
    where: {
      status: "paid",
      periodStart: { gte: startDate },
    },
    orderBy: { periodStart: "asc" },
  });

  // Group by month
  const monthlyData: Record<string, {
    month: string;
    baseRevenue: number;
    overageRevenue: number;
    totalRevenue: number;
    invoiceCount: number;
    totalUnits: number;
  }> = {};

  for (const invoice of invoices) {
    const monthKey = invoice.periodStart.toISOString().slice(0, 7);

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        month: monthKey,
        baseRevenue: 0,
        overageRevenue: 0,
        totalRevenue: 0,
        invoiceCount: 0,
        totalUnits: 0,
      };
    }

    monthlyData[monthKey].baseRevenue += invoice.baseAmount;
    monthlyData[monthKey].overageRevenue += invoice.overageAmount;
    monthlyData[monthKey].totalRevenue += invoice.amountPaid;
    monthlyData[monthKey].invoiceCount += 1;
    monthlyData[monthKey].totalUnits += invoice.overageUnits;
  }

  return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Get customer-specific revenue history
 */
export async function getCustomerRevenueHistory(stripeCustomerId: string, months: number = 12) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const invoices = await db.stripeInvoice.findMany({
    where: {
      stripeCustomerId,
      status: "paid",
      periodStart: { gte: startDate },
    },
    orderBy: { periodStart: "asc" },
  });

  return invoices.map((inv) => ({
    month: inv.periodStart.toISOString().slice(0, 7),
    baseRevenue: inv.baseAmount,
    overageRevenue: inv.overageAmount,
    totalRevenue: inv.amountPaid,
    units: inv.overageUnits,
  }));
}

/**
 * Full sync: customers, invoices, and unbilled
 */
export async function fullStripeSync() {
  const job = await db.syncJob.create({
    data: {
      type: "full",
      status: "running",
      startedAt: new Date(),
    },
  });

  try {
    const { syncAllStripeCustomers } = await import("./stripe-sync");

    // 1. Sync customers
    const customerResult = await syncAllStripeCustomers();

    // 2. Sync all historical invoices
    const invoiceResult = await syncAllInvoices();

    // 3. Sync current unbilled amounts
    const unbilledResult = await syncUnbilledAmounts();

    const stats = {
      customers: customerResult,
      invoices: invoiceResult,
      unbilled: unbilledResult,
    };

    await db.syncJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        stats: JSON.stringify(stats),
      },
    });

    return stats;
  } catch (error) {
    await db.syncJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        completedAt: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
    throw error;
  }
}

/**
 * Get last sync status
 */
export async function getLastSyncStatus() {
  return db.syncJob.findFirst({
    orderBy: { createdAt: "desc" },
  });
}

// ============================================
// COMPARISON FUNCTIONS (MoM and YoY)
// ============================================

export interface PeriodComparison {
  currentPeriod: {
    month: string;
    totalRevenue: number;
    baseRevenue: number;
    overageRevenue: number;
    invoiceCount: number;
    totalUnits: number;
  };
  comparisonPeriod: {
    month: string;
    totalRevenue: number;
    baseRevenue: number;
    overageRevenue: number;
    invoiceCount: number;
    totalUnits: number;
  } | null;
  change: {
    revenueChange: number;
    revenueChangePercent: number;
    unitsChange: number;
    unitsChangePercent: number;
  } | null;
}

/**
 * Get month-over-month comparison for a specific month
 * Compares revenue by when invoices were PAID (not period start)
 */
export async function getMonthOverMonthComparison(month?: string): Promise<PeriodComparison> {
  const targetMonth = month || new Date().toISOString().slice(0, 7);
  
  // Calculate previous month
  const [year, monthNum] = targetMonth.split("-").map(Number);
  const prevMonthDate = new Date(year, monthNum - 2, 1); // month - 2 because monthNum is 1-based and we want previous
  const prevMonth = prevMonthDate.toISOString().slice(0, 7);

  // Get invoices PAID in both periods
  const currentMonthStart = new Date(`${targetMonth}-01`);
  const currentMonthEnd = new Date(year, monthNum, 1);
  const prevMonthStart = new Date(`${prevMonth}-01`);
  const prevMonthEnd = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 1);

  const [currentInvoices, prevInvoices] = await Promise.all([
    db.stripeInvoice.findMany({
      where: {
        status: "paid",
        paidAt: {
          gte: currentMonthStart,
          lt: currentMonthEnd,
        },
      },
    }),
    db.stripeInvoice.findMany({
      where: {
        status: "paid",
        paidAt: {
          gte: prevMonthStart,
          lt: prevMonthEnd,
        },
      },
    }),
  ]);

  // Calculate current period totals
  const currentPeriod = {
    month: targetMonth,
    totalRevenue: currentInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0),
    baseRevenue: currentInvoices.reduce((sum, inv) => sum + inv.baseAmount, 0),
    overageRevenue: currentInvoices.reduce((sum, inv) => sum + inv.overageAmount, 0),
    invoiceCount: currentInvoices.length,
    totalUnits: currentInvoices.reduce((sum, inv) => sum + inv.overageUnits, 0),
  };

  // Calculate previous month totals (if data exists)
  let comparisonPeriod = null;
  let change = null;

  if (prevInvoices.length > 0) {
    comparisonPeriod = {
      month: prevMonth,
      totalRevenue: prevInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0),
      baseRevenue: prevInvoices.reduce((sum, inv) => sum + inv.baseAmount, 0),
      overageRevenue: prevInvoices.reduce((sum, inv) => sum + inv.overageAmount, 0),
      invoiceCount: prevInvoices.length,
      totalUnits: prevInvoices.reduce((sum, inv) => sum + inv.overageUnits, 0),
    };

    // Calculate changes
    const revenueChange = currentPeriod.totalRevenue - comparisonPeriod.totalRevenue;
    const revenueChangePercent = comparisonPeriod.totalRevenue > 0
      ? (revenueChange / comparisonPeriod.totalRevenue) * 100
      : 0;
    const unitsChange = currentPeriod.totalUnits - comparisonPeriod.totalUnits;
    const unitsChangePercent = comparisonPeriod.totalUnits > 0
      ? (unitsChange / comparisonPeriod.totalUnits) * 100
      : 0;

    change = {
      revenueChange,
      revenueChangePercent,
      unitsChange,
      unitsChangePercent,
    };
  }

  return {
    currentPeriod,
    comparisonPeriod,
    change,
  };
}

export interface YoYComparison {
  currentPeriod: {
    month: string;
    totalRevenue: number;
    baseRevenue: number;
    overageRevenue: number;
    invoiceCount: number;
    totalUnits: number;
  };
  lastYearPeriod: {
    month: string;
    totalRevenue: number;
    baseRevenue: number;
    overageRevenue: number;
    invoiceCount: number;
    totalUnits: number;
  } | null;
  change: {
    revenueChange: number;
    revenueChangePercent: number;
    unitsChange: number;
    unitsChangePercent: number;
  } | null;
}

/**
 * Get year-over-year comparison for a specific month
 * Compares revenue by when invoices were PAID (not period start)
 */
export async function getYearOverYearComparison(month?: string): Promise<YoYComparison> {
  const targetMonth = month || new Date().toISOString().slice(0, 7);
  
  // Calculate same month last year
  const [year, monthNum] = targetMonth.split("-").map(Number);
  const lastYearMonth = `${year - 1}-${String(monthNum).padStart(2, "0")}`;

  // Get invoices PAID in both periods (use paidAt, not periodStart)
  const currentMonthStart = new Date(`${targetMonth}-01`);
  const currentMonthEnd = new Date(year, monthNum, 1); // First day of next month
  const lastYearMonthStart = new Date(`${lastYearMonth}-01`);
  const lastYearMonthEnd = new Date(year - 1, monthNum, 1);

  const [currentInvoices, lastYearInvoices] = await Promise.all([
    db.stripeInvoice.findMany({
      where: {
        status: "paid",
        paidAt: {
          gte: currentMonthStart,
          lt: currentMonthEnd,
        },
      },
    }),
    db.stripeInvoice.findMany({
      where: {
        status: "paid",
        paidAt: {
          gte: lastYearMonthStart,
          lt: lastYearMonthEnd,
        },
      },
    }),
  ]);

  // Calculate current period totals
  const currentPeriod = {
    month: targetMonth,
    totalRevenue: currentInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0),
    baseRevenue: currentInvoices.reduce((sum, inv) => sum + inv.baseAmount, 0),
    overageRevenue: currentInvoices.reduce((sum, inv) => sum + inv.overageAmount, 0),
    invoiceCount: currentInvoices.length,
    totalUnits: currentInvoices.reduce((sum, inv) => sum + inv.overageUnits, 0),
  };

  // Calculate last year period totals (if data exists)
  let lastYearPeriod = null;
  let change = null;

  if (lastYearInvoices.length > 0) {
    lastYearPeriod = {
      month: lastYearMonth,
      totalRevenue: lastYearInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0),
      baseRevenue: lastYearInvoices.reduce((sum, inv) => sum + inv.baseAmount, 0),
      overageRevenue: lastYearInvoices.reduce((sum, inv) => sum + inv.overageAmount, 0),
      invoiceCount: lastYearInvoices.length,
      totalUnits: lastYearInvoices.reduce((sum, inv) => sum + inv.overageUnits, 0),
    };

    // Calculate changes
    const revenueChange = currentPeriod.totalRevenue - lastYearPeriod.totalRevenue;
    const revenueChangePercent = lastYearPeriod.totalRevenue > 0
      ? (revenueChange / lastYearPeriod.totalRevenue) * 100
      : 0;
    const unitsChange = currentPeriod.totalUnits - lastYearPeriod.totalUnits;
    const unitsChangePercent = lastYearPeriod.totalUnits > 0
      ? (unitsChange / lastYearPeriod.totalUnits) * 100
      : 0;

    change = {
      revenueChange,
      revenueChangePercent,
      unitsChange,
      unitsChangePercent,
    };
  }

  return {
    currentPeriod,
    lastYearPeriod,
    change,
  };
}

/**
 * Get "this day last year" comparison - what was our revenue up to this day last year?
 */
export async function getThisDayLastYear(): Promise<{
  currentYear: {
    month: string;
    dayOfMonth: number;
    revenueToDate: number;
    overagesToDate: number;
    invoiceCount: number;
  };
  lastYear: {
    month: string;
    dayOfMonth: number;
    revenueToDate: number;
    overagesToDate: number;
    invoiceCount: number;
  } | null;
  comparison: {
    revenueDiff: number;
    revenueDiffPercent: number;
  } | null;
}> {
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const currentDay = now.getDate();
  
  // Same month last year
  const lastYearDate = new Date(now);
  lastYearDate.setFullYear(lastYearDate.getFullYear() - 1);
  const lastYearMonth = lastYearDate.toISOString().slice(0, 7);

  // Get invoices paid up to this day in both years
  const [currentYearInvoices, lastYearInvoices] = await Promise.all([
    db.stripeInvoice.findMany({
      where: {
        status: "paid",
        paidAt: {
          gte: new Date(`${currentMonth}-01`),
          lte: now,
        },
      },
    }),
    db.stripeInvoice.findMany({
      where: {
        status: "paid",
        paidAt: {
          gte: new Date(`${lastYearMonth}-01`),
          lte: lastYearDate,
        },
      },
    }),
  ]);

  const currentYear = {
    month: currentMonth,
    dayOfMonth: currentDay,
    revenueToDate: currentYearInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0),
    overagesToDate: currentYearInvoices.reduce((sum, inv) => sum + inv.overageAmount, 0),
    invoiceCount: currentYearInvoices.length,
  };

  let lastYear = null;
  let comparison = null;

  if (lastYearInvoices.length > 0) {
    lastYear = {
      month: lastYearMonth,
      dayOfMonth: currentDay,
      revenueToDate: lastYearInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0),
      overagesToDate: lastYearInvoices.reduce((sum, inv) => sum + inv.overageAmount, 0),
      invoiceCount: lastYearInvoices.length,
    };

    const revenueDiff = currentYear.revenueToDate - lastYear.revenueToDate;
    const revenueDiffPercent = lastYear.revenueToDate > 0
      ? (revenueDiff / lastYear.revenueToDate) * 100
      : 0;

    comparison = {
      revenueDiff,
      revenueDiffPercent,
    };
  }

  return {
    currentYear,
    lastYear,
    comparison,
  };
}

/**
 * Get historical monthly data for the past N months (for charts)
 */
export async function getMonthlyTrend(months: number = 12): Promise<{
  month: string;
  monthName: string;
  totalRevenue: number;
  baseRevenue: number;
  overageRevenue: number;
  invoiceCount: number;
  totalUnits: number;
}[]> {
  const history = await getRevenueHistory(months);
  
  return history.map(h => ({
    month: h.month,
    monthName: new Date(h.month + "-01").toLocaleDateString("en-US", { 
      month: "short", 
      year: "numeric" 
    }),
    totalRevenue: h.totalRevenue,
    baseRevenue: h.baseRevenue,
    overageRevenue: h.overageRevenue,
    invoiceCount: h.invoiceCount,
    totalUnits: h.totalUnits,
  }));
}
