import { stripe, StripeMetrics, StripeCustomerData } from "./stripe";
import { db } from "./db";
import Stripe from "stripe";

/**
 * Sync all customers from Stripe to local database
 */
export async function syncAllStripeCustomers(): Promise<{
  synced: number;
  created: number;
  updated: number;
}> {
  let synced = 0;
  let created = 0;
  let updated = 0;

  // Get all subscriptions (active and trialing)
  const subscriptions = await stripe.subscriptions.list({
    status: "all",
    limit: 100,
    expand: ["data.customer"],
  });

  for (const sub of subscriptions.data) {
    if (sub.status === "canceled" || sub.status === "incomplete_expired") {
      continue;
    }

    const customer = sub.customer as Stripe.Customer;
    if (!customer || typeof customer === "string") continue;

    // Calculate monthly amount from subscription items
    let monthlyAmount = 0;
    for (const item of sub.items.data) {
      if (item.price.unit_amount && item.price.recurring?.usage_type !== "metered") {
        let amount = item.price.unit_amount * (item.quantity || 1);
        if (item.price.recurring?.interval === "year") {
          amount = amount / 12;
        }
        monthlyAmount += amount;
      }
    }

    // Access subscription period - cast to any to handle API version differences
    const subAny = sub as unknown as Record<string, unknown>;
    const periodStart = (subAny.current_period_start as number) || Math.floor(Date.now() / 1000);
    const periodEnd = (subAny.current_period_end as number) || Math.floor(Date.now() / 1000);
    
    const stripeData: StripeCustomerData = {
      stripeCustomerId: customer.id,
      stripeSubId: sub.id,
      email: customer.email ?? null,
      stripeName: customer.name ?? null,
      subscriptionStatus: sub.status,
      trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
      currentPeriodStart: new Date(periodStart * 1000),
      currentPeriodEnd: new Date(periodEnd * 1000),
      monthlyAmount: monthlyAmount / 100, // Convert cents to dollars
    };

    // Upsert to database
    const existing = await db.stripeCustomer.findUnique({
      where: { stripeCustomerId: customer.id },
    });

    if (existing) {
      await db.stripeCustomer.update({
        where: { stripeCustomerId: customer.id },
        data: {
          ...stripeData,
          lastSyncedAt: new Date(),
        },
      });
      updated++;
    } else {
      await db.stripeCustomer.create({
        data: {
          ...stripeData,
          lastSyncedAt: new Date(),
        },
      });
      created++;
    }
    synced++;
  }

  return { synced, created, updated };
}

/**
 * Get real-time metrics from Stripe
 */
export async function getStripeMetrics(): Promise<StripeMetrics> {
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

  let totalMRR = 0;

  // Calculate MRR from active subscriptions
  for (const sub of activeSubs.data) {
    for (const item of sub.items.data) {
      if (item.price.unit_amount && item.price.recurring?.usage_type !== "metered") {
        let amount = item.price.unit_amount * (item.quantity || 1);
        if (item.price.recurring?.interval === "year") {
          amount = amount / 12;
        }
        totalMRR += amount;
      }
    }
  }

  // Format trialing subscriptions
  const trialingData = trialingSubs.data.map((sub) => {
    const customer = sub.customer as Stripe.Customer;
    const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : new Date();
    const daysLeft = Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    return {
      customerName: customer?.name || "Unknown",
      email: customer?.email || "",
      trialEnd,
      daysLeft: Math.max(0, daysLeft),
    };
  });

  // Format upcoming trial ends with monthly amount
  const upcomingTrialEnds = trialingSubs.data.map((sub) => {
    const customer = sub.customer as Stripe.Customer;
    const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000) : new Date();
    const daysLeft = Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    // Calculate monthly amount from subscription
    let monthlyAmount = 0;
    for (const item of sub.items.data) {
      if (item.price.unit_amount && item.price.recurring?.usage_type !== "metered") {
        let amount = item.price.unit_amount * (item.quantity || 1);
        if (item.price.recurring?.interval === "year") {
          amount = amount / 12;
        }
        monthlyAmount += amount;
      }
    }

    return {
      stripeCustomerId: customer?.id || "",
      name: customer?.name || "Unknown",
      email: customer?.email || "",
      trialEnd,
      daysLeft: Math.max(0, daysLeft),
      monthlyAmount: monthlyAmount / 100,
    };
  });

  return {
    totalMRR: totalMRR / 100, // Convert cents to dollars
    activeCount: activeSubs.data.length,
    trialingCount: trialingSubs.data.length,
    trialingSubs: trialingData.sort((a, b) => a.daysLeft - b.daysLeft),
    upcomingTrialEnds: upcomingTrialEnds.sort((a, b) => a.daysLeft - b.daysLeft),
  };
}

/**
 * Get usage (overages) for a customer in current period
 * Uses invoice preview which includes metered usage
 */
export async function getCustomerUsage(stripeCustomerId: string, stripeSubId: string): Promise<number> {
  try {
    // Use invoice preview to get current usage
    const preview = await stripe.invoices.createPreview({
      customer: stripeCustomerId,
      subscription: stripeSubId,
    });
    
    let totalUsage = 0;
    for (const line of preview.lines.data) {
      // Count quantities for metered items (quantity > 1)
      if (line.quantity != null && line.quantity > 1) {
        totalUsage += line.quantity;
      }
    }
    
    return totalUsage;
  } catch {
    return 0;
  }
}

/**
 * Get all Stripe customers
 */
export async function getAllStripeCustomers() {
  return db.stripeCustomer.findMany({
    include: {
      unbilledSnapshot: true,
      invoices: {
        orderBy: { periodEnd: "desc" },
        take: 6, // Last 6 invoices for historical comparison
      },
    },
    orderBy: { stripeName: "asc" },
  });
}
