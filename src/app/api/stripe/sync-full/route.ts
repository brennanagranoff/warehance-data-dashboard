import { NextResponse } from "next/server";
import { fullStripeSync, getLastSyncStatus } from "@/lib/stripe-history";

export async function POST() {
  try {
    const result = await fullStripeSync();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Full Stripe sync error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sync with Stripe" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const lastSync = await getLastSyncStatus();
    return NextResponse.json({
      lastSync,
    });
  } catch (error) {
    console.error("Get sync status error:", error);
    return NextResponse.json(
      { error: "Failed to get sync status" },
      { status: 500 }
    );
  }
}





