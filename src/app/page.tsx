import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  TrendingUp, 
  Users,
  Activity,
  RefreshCw,
  Calendar,
} from "lucide-react";
import { getAllProjections, getBillingCalendar, formatCurrency } from "@/lib/revenue-projections";
import { getYearOverYearComparison, getMonthOverMonthComparison, getLastSyncStatus } from "@/lib/stripe-history";
import { getStripeMetrics } from "@/lib/stripe-sync";
import { BillingSchedule } from "./billing-schedule";
import { CustomerCards, ComparisonCards } from "./revenue-timeline";
import { SyncButton } from "./stripe/sync-button";
import { MonthSelector } from "./month-selector";

interface PageProps {
  searchParams: Promise<{ month?: string }>;
}

async function DashboardContent({ selectedMonth }: { selectedMonth: string }) {
  const [year, monthNum] = selectedMonth.split("-").map(Number);
  const monthName = new Date(year, monthNum - 1, 1).toLocaleDateString("en-US", { 
    month: "long", 
    year: "numeric" 
  });
  
  const [allProjections, yoy, mom, metrics, lastSync] = await Promise.all([
    getAllProjections(),
    getYearOverYearComparison(selectedMonth),
    getMonthOverMonthComparison(selectedMonth),
    getStripeMetrics(),
    getLastSyncStatus(),
  ]);

  // Filter projections by billing month (when the invoice hits)
  const monthProjections = allProjections.filter(p => {
    const billingMonth = p.periodEnd.toISOString().slice(0, 7);
    return billingMonth === selectedMonth;
  });

  // Total revenue for the month = collected + upcoming unbilled
  const collectedRevenue = yoy.currentPeriod.totalRevenue;
  const upcomingRevenue = monthProjections.reduce((sum, p) => sum + p.paceProjectedTotal, 0);
  const totalMonthRevenue = collectedRevenue + upcomingRevenue;

  // Build calendar for this specific month
  const billingCalendar = monthProjections.map(p => ({
    date: p.periodEnd,
    dateKey: p.periodEnd.toISOString().slice(0, 10),
    dayOfMonth: p.periodEnd.getDate(),
    customers: [{
      stripeCustomerId: p.stripeCustomerId,
      customerName: p.customerName,
      baseFee: p.baseFee,
      projectedOverage: p.paceProjectedOverage,
      projectedTotal: p.paceProjectedTotal,
    }],
    totalAmount: p.paceProjectedTotal,
    customerCount: 1,
  }));

  // Group by day for calendar
  const calendarByDay = new Map<string, typeof billingCalendar[0]>();
  for (const entry of billingCalendar) {
    const existing = calendarByDay.get(entry.dateKey);
    if (existing) {
      existing.customers.push(...entry.customers);
      existing.totalAmount += entry.totalAmount;
      existing.customerCount += 1;
    } else {
      calendarByDay.set(entry.dateKey, { ...entry });
    }
  }
  const groupedCalendar = Array.from(calendarByDay.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  // Calculate totals for selected month
  const monthTotal = monthProjections.reduce((sum, p) => sum + p.paceProjectedTotal, 0);
  const monthBase = monthProjections.reduce((sum, p) => sum + p.baseFee, 0);
  const monthOverages = monthProjections.reduce((sum, p) => sum + p.paceProjectedOverage, 0);
  const monthCurrent = monthProjections.reduce((sum, p) => sum + p.currentTotal, 0);

  const formatSyncTime = (date: Date | null) => {
    if (!date) return "Never";
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with month selector and sync status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Revenue Dashboard</h1>
          <p className="text-muted-foreground">
            Unbilled revenue by billing month
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            Last sync: {formatSyncTime(lastSync?.completedAt || null)}
          </div>
          <SyncButton />
        </div>
      </div>

      {/* Month Selector */}
      <div className="flex items-center justify-center">
        <MonthSelector currentMonth={selectedMonth} />
      </div>

      {/* Month Header with totals */}
      <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-0">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 opacity-80" />
              <div>
                <h2 className="text-2xl font-bold">{monthName} Revenue</h2>
                <p className="text-sm opacity-70">
                  {yoy.currentPeriod.invoiceCount} collected + {monthProjections.length} upcoming
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm opacity-70">Total Revenue</div>
              <div className="text-3xl font-bold">{formatCurrency(totalMonthRevenue)}</div>
            </div>
          </div>
          <div className="flex gap-8 text-sm opacity-80">
            <div>Collected: {formatCurrency(collectedRevenue)}</div>
            <div>Upcoming: {formatCurrency(upcomingRevenue)}</div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Already Collected */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">
              Already Collected
            </CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{formatCurrency(collectedRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {yoy.currentPeriod.invoiceCount} invoices paid in {monthName}
            </p>
          </CardContent>
        </Card>

        {/* Upcoming/Scheduled */}
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">
              Upcoming (Scheduled)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">
              {formatCurrency(upcomingRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {monthProjections.length} invoices still to bill
            </p>
          </CardContent>
        </Card>

        {/* Active Subscriptions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Subscriptions
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeCount}</div>
            {metrics.trialingCount > 0 && (
              <p className="text-xs text-amber-600 mt-1">
                +{metrics.trialingCount} trialing
              </p>
            )}
          </CardContent>
        </Card>

        {/* MRR from Stripe */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Stripe MRR
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalMRR)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Base subscription fees
            </p>
          </CardContent>
        </Card>
      </div>

      {/* MoM and YoY Comparisons */}
      <ComparisonCards
        projectedRevenue={totalMonthRevenue}
        collectedRevenue={collectedRevenue}
        momRevenue={mom.comparisonPeriod?.totalRevenue ?? null}
        yoyRevenue={yoy.lastYearPeriod?.totalRevenue ?? null}
        currentMonth={selectedMonth}
      />

      {/* Trialing customers alert */}
      {metrics.trialingCount > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-800 flex items-center gap-2">
              <Badge variant="secondary" className="bg-amber-200 text-amber-800">
                {metrics.trialingCount} Trialing
              </Badge>
              Upcoming Trial Conversions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {metrics.upcomingTrialEnds.slice(0, 6).map((trial) => (
                <div key={trial.stripeCustomerId} className="flex items-center justify-between bg-white p-3 rounded-lg">
                  <div>
                    <div className="font-medium">{trial.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {trial.daysLeft} days left
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-700">{formatCurrency(trial.monthlyAmount)}</div>
                    <div className="text-xs text-muted-foreground">/month</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing Schedule - Full width with calendar/list toggle */}
      {monthProjections.length > 0 ? (
        <BillingSchedule
          billingCalendar={groupedCalendar}
          month={selectedMonth}
          projectedTotal={monthTotal}
        />
      ) : (
        <Card className="p-8 text-center">
          <div className="text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No invoices scheduled for {monthName}</p>
            <p className="text-sm mt-2">Try selecting a different month using the arrows above</p>
          </div>
        </Card>
      )}

      {/* Customer Projections */}
      {monthProjections.length > 0 && (
        <CustomerCards customers={monthProjections} />
      )}
    </div>
  );
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  // Default to next month since that's likely when current unbilled will hit
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const defaultMonth = nextMonth.toISOString().slice(0, 7);
  const selectedMonth = params.month || defaultMonth;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="container mx-auto py-6 px-4">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent selectedMonth={selectedMonth} />
        </Suspense>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-12 bg-gray-200 rounded animate-pulse w-64" />
      <div className="h-32 bg-gray-200 rounded animate-pulse" />
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-96 bg-gray-200 rounded animate-pulse" />
        <div className="h-96 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );
}
