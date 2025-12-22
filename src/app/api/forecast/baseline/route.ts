import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentMonth } from "@/lib/revenue";

export async function GET() {
  const month = getCurrentMonth();
  
  const [customers, payrollEntry] = await Promise.all([
    db.customer.findMany({
      where: { status: { not: "Inactive" } },
      include: {
        pricing: true,
        monthlyEstimates: {
          where: { month },
        },
      },
    }),
    db.payroll.findUnique({
      where: { month },
    }),
  ]);

  let totalMRR = 0;
  let totalShipments = 0;

  for (const customer of customers) {
    const pricing = customer.pricing;
    if (!pricing) continue;

    const estimate = customer.monthlyEstimates[0];
    const shipments = estimate?.estimatedShipments ?? 0;
    totalShipments += shipments;

    const baseFee = pricing.baseFee;
    const overage = Math.max(0, shipments - pricing.includedShipments) * pricing.overageRate;
    const labelFee = pricing.labelFeeEnabled
      ? shipments * pricing.labelFeeRate * pricing.labelFeePercentage
      : 0;
    
    totalMRR += baseFee + overage + labelFee;
  }

  const avgShipmentsPerCustomer = customers.length > 0 
    ? Math.round(totalShipments / customers.length) 
    : 0;
  
  const avgBaseFee = customers.length > 0
    ? Math.round(customers.reduce((sum, c) => sum + (c.pricing?.baseFee ?? 0), 0) / customers.length)
    : 0;

  return NextResponse.json({
    currentMRR: totalMRR,
    payroll: payrollEntry?.amount ?? 0,
    activeCustomers: customers.length,
    avgShipments: avgShipmentsPerCustomer,
    avgBaseFee,
  });
}

