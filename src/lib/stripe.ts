import Stripe from "stripe";

if (!process.env.STRIPE_KEY) {
  throw new Error("STRIPE_KEY environment variable is required");
}

export const stripe = new Stripe(process.env.STRIPE_KEY, {
  apiVersion: "2025-12-15.clover",
});

export interface StripeMetrics {
  totalMRR: number;
  activeCount: number;
  trialingCount: number;
  trialingSubs: {
    customerName: string;
    email: string;
    trialEnd: Date;
    daysLeft: number;
  }[];
  upcomingTrialEnds: {
    stripeCustomerId: string;
    name: string;
    email: string;
    trialEnd: Date;
    daysLeft: number;
    monthlyAmount: number;
  }[];
}

export interface StripeCustomerData {
  stripeCustomerId: string;
  stripeSubId: string | null;
  email: string | null;
  stripeName: string | null;
  subscriptionStatus: string | null;
  trialEnd: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  monthlyAmount: number;
}

