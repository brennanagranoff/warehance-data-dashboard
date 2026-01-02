import { NextResponse } from "next/server";
import { getStripeMetrics } from "@/lib/stripe-sync";

export async function GET() {
  try {
    const metrics = await getStripeMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Stripe metrics error:", error);
    return NextResponse.json(
      { error: "Failed to get Stripe metrics" },
      { status: 500 }
    );
  }
}





