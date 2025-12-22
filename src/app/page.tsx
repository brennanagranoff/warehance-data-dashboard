import { Suspense } from "react";
import { db } from "@/lib/db";
import { MonthSelector } from "@/components/month-selector";
import { DashboardClient } from "@/components/dashboard-client";
import { CustomerRevenueData } from "@/app/dashboard-row";
import {
  calculateCustomerRevenue,
  isCustomerActiveForMonth,
  getCurrentMonth,
  getMonthOptions,
  formatCurrency,
} from "@/lib/revenue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function getDashboardData(month: string) {
  const [customers, payrollEntry] = await Promise.all([
    db.customer.findMany({
      include: {
        pricing: true,
        monthlyEstimates: true,
      },
      orderBy: { name: "asc" },
    }),
    db.payroll.findUnique({
      where: { month },
    }),
  ]);

  const revenueData: CustomerRevenueData[] = [];
  const pricingIds: Record<string, string> = {};

  for (const customer of customers) {
    if (!isCustomerActiveForMonth(customer.status, customer.startDate, month)) {
      continue;
    }

    const pricing = customer.pricing;
    if (!pricing) continue;

    pricingIds[customer.id] = pricing.id;

    // Find estimate for this month, or use any existing estimate as baseline
    let estimate = customer.monthlyEstimates.find((e) => e.month === month);
    if (!estimate && customer.monthlyEstimates.length > 0) {
      // Use the most recent estimate as baseline for future months
      estimate = customer.monthlyEstimates.sort((a, b) => b.month.localeCompare(a.month))[0];
    }
    const estimatedShipments = estimate?.estimatedShipments ?? 0;

    const revenue = calculateCustomerRevenue(
      {
        baseFee: pricing.baseFee,
        includedShipments: pricing.includedShipments,
        overageRate: pricing.overageRate,
        labelFeeEnabled: pricing.labelFeeEnabled,
        labelFeeRate: pricing.labelFeeRate,
        labelFeePercentage: pricing.labelFeePercentage,
      },
      estimatedShipments
    );

    revenueData.push({
      customerId: customer.id,
      name: customer.name,
      status: customer.status,
      estimatedShipments: revenue.estimatedShipments,
      baseFee: revenue.baseFee,
      overageRevenue: revenue.overageRevenue,
      labelRevenue: revenue.labelRevenue,
      totalRevenue: revenue.totalRevenue,
      labelFeeEnabled: pricing.labelFeeEnabled,
      labelFeeRate: pricing.labelFeeRate,
      labelFeePercentage: pricing.labelFeePercentage,
    });
  }

  const totalMRR = revenueData.reduce((sum, c) => sum + c.totalRevenue, 0);
  const payroll = payrollEntry?.amount ?? 0;

  return {
    revenueData,
    pricingIds,
    totalMRR,
    payroll,
    activeCustomers: revenueData.length,
    customers,
  };
}

async function get90DayProjection(customers: Awaited<ReturnType<typeof getDashboardData>>["customers"]) {
  const monthOptions = getMonthOptions(4);
  const projections = [];

  for (const monthOption of monthOptions) {
    const month = monthOption.value;
    const payrollEntry = await db.payroll.findUnique({ where: { month } });
    let monthRevenue = 0;

    for (const customer of customers) {
      if (!isCustomerActiveForMonth(customer.status, customer.startDate, month)) {
        continue;
      }

      const pricing = customer.pricing;
      if (!pricing) continue;

      // Find estimate for this month, or use any existing estimate as baseline
      let estimate = customer.monthlyEstimates.find((e) => e.month === month);
      if (!estimate && customer.monthlyEstimates.length > 0) {
        estimate = customer.monthlyEstimates.sort((a, b) => b.month.localeCompare(a.month))[0];
      }
      const estimatedShipments = estimate?.estimatedShipments ?? 0;

      const revenue = calculateCustomerRevenue(
        {
          baseFee: pricing.baseFee,
          includedShipments: pricing.includedShipments,
          overageRate: pricing.overageRate,
          labelFeeEnabled: pricing.labelFeeEnabled,
          labelFeeRate: pricing.labelFeeRate,
          labelFeePercentage: pricing.labelFeePercentage,
        },
        estimatedShipments
      );

      monthRevenue += revenue.totalRevenue;
    }

    projections.push({
      month: monthOption.label,
      revenue: monthRevenue,
      payroll: payrollEntry?.amount ?? 0,
      profit: monthRevenue - (payrollEntry?.amount ?? 0),
    });
  }

  return projections;
}

interface DashboardContentProps {
  month: string;
}

async function DashboardContent({ month }: DashboardContentProps) {
  const data = await getDashboardData(month);
  const projections = await get90DayProjection(data.customers);

  return (
    <div className="space-y-8">
      <DashboardClient
        totalMRR={data.totalMRR}
        payroll={data.payroll}
        activeCustomers={data.activeCustomers}
        revenueData={data.revenueData}
        pricingIds={data.pricingIds}
        month={month}
      />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">90-Day Projection</h2>
        <div className="grid gap-4 md:grid-cols-4">
          {projections.map((p) => (
            <Card key={p.month}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{p.month}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Revenue</span>
                  <span>{formatCurrency(p.revenue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payroll</span>
                  <span>{formatCurrency(p.payroll)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium pt-1 border-t">
                  <span>Profit</span>
                  <span className={p.profit < 0 ? "text-destructive" : "text-green-600"}>
                    {formatCurrency(p.profit)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const month = params.month ?? getCurrentMonth();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Revenue overview and projections</p>
        </div>
        <Suspense fallback={<div className="w-[180px] h-10 bg-muted animate-pulse rounded" />}>
          <MonthSelector currentMonth={month} />
        </Suspense>
      </div>

      <Suspense fallback={<div className="space-y-4"><div className="h-32 bg-muted animate-pulse rounded" /></div>}>
        <DashboardContent month={month} />
      </Suspense>
    </div>
  );
}
