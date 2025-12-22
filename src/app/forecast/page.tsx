import { Suspense } from "react";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, getCurrentMonth } from "@/lib/revenue";
import { ForecastClient } from "./forecast-client";

async function getBaselineData() {
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

    // Calculate revenue
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

  return {
    currentMRR: totalMRR,
    payroll: payrollEntry?.amount ?? 0,
    activeCustomers: customers.length,
    avgShipments: avgShipmentsPerCustomer,
    avgBaseFee,
  };
}

async function ForecastContent() {
  const baseline = await getBaselineData();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current MRR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(baseline.currentMRR)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Payroll
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(baseline.payroll)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{baseline.activeCustomers}</div>
          </CardContent>
        </Card>
      </div>

      <ForecastClient baseline={baseline} />
    </div>
  );
}

export default function ForecastPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Revenue Forecast</h1>
        <p className="text-muted-foreground">Project revenue based on growth assumptions</p>
      </div>

      <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded" />}>
        <ForecastContent />
      </Suspense>
    </div>
  );
}

