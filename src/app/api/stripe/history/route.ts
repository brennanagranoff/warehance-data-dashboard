import { NextRequest, NextResponse } from "next/server";
import { getRevenueHistory, getCustomerRevenueHistory } from "@/lib/stripe-history";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const months = parseInt(searchParams.get("months") || "12", 10);
    const customerId = searchParams.get("customerId");

    if (customerId) {
      const history = await getCustomerRevenueHistory(customerId, months);
      return NextResponse.json(history);
    }

    const history = await getRevenueHistory(months);
    return NextResponse.json(history);
  } catch (error) {
    console.error("Get revenue history error:", error);
    return NextResponse.json(
      { error: "Failed to get revenue history" },
      { status: 500 }
    );
  }
}





