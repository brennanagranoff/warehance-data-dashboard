import { NextRequest, NextResponse } from "next/server";
import { getUnbilledAmounts, refreshUnbilledAmounts } from "@/lib/stripe-history";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get("refresh") === "true";

    // If refresh requested, sync from Stripe first
    const unbilled = refresh 
      ? await refreshUnbilledAmounts()
      : await getUnbilledAmounts();

    return NextResponse.json(unbilled);
  } catch (error) {
    console.error("Get unbilled error:", error);
    return NextResponse.json(
      { error: "Failed to get unbilled amounts" },
      { status: 500 }
    );
  }
}
