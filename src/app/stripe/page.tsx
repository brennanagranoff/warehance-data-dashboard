import { Suspense } from "react";
import { db } from "@/lib/db";
import { getStripeMetrics } from "@/lib/stripe-sync";
import { getLastSyncStatus, getRevenueHistory } from "@/lib/stripe-history";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/revenue-projections";
import { SyncButton } from "./sync-button";
import { FullSyncButton } from "../analytics/full-sync-button";

async function getStripeData() {
  const [stripeCustomers, metrics, lastSync, history] = await Promise.all([
    db.stripeCustomer.findMany({
      include: {
        unbilledSnapshot: true,
        invoices: {
          orderBy: { periodEnd: "desc" },
          take: 3,
        },
      },
      orderBy: { stripeName: "asc" },
    }),
    getStripeMetrics(),
    getLastSyncStatus(),
    getRevenueHistory(6),
  ]);

  return { stripeCustomers, metrics, lastSync, history };
}

async function StripeContent() {
  const { stripeCustomers, metrics, lastSync, history } = await getStripeData();
  
  const formatSyncTime = (date: Date | null | undefined) => {
    if (!date) return "Never";
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Sync Status and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Last sync: {formatSyncTime(lastSync?.completedAt)}
          </span>
          {lastSync?.status === "completed" && (
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              Healthy
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <SyncButton />
          <FullSyncButton />
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Stripe MRR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalMRR)}</div>
            <p className="text-xs text-muted-foreground">Base subscription fees</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeCount}</div>
          </CardContent>
        </Card>
        <Card className={metrics.trialingCount > 0 ? "border-amber-400" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Trialing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.trialingCount}</div>
            <p className="text-xs text-amber-600">Pending conversion</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Customers Synced
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stripeCustomers.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue History */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue History (Last 6 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-6">
            {history.map((month) => (
              <div key={month.month} className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-xs text-muted-foreground mb-1">
                  {new Date(month.month + "-01").toLocaleDateString("en-US", { month: "short" })}
                </div>
                <div className="text-lg font-bold">{formatCurrency(month.totalRevenue)}</div>
                <div className="text-xs text-muted-foreground">
                  {month.invoiceCount} invoices
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trialing Customers */}
      {metrics.trialingCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Upcoming Trial Ends</span>
              <Badge variant="secondary">{metrics.trialingCount}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.trialingSubs.map((trial, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <div className="font-medium">{trial.customerName}</div>
                    <div className="text-sm text-muted-foreground">{trial.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {trial.daysLeft} days left
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {trial.trialEnd.toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer List */}
      <Card>
        <CardHeader>
          <CardTitle>All Stripe Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stripeCustomers.map((customer) => (
              <div 
                key={customer.stripeCustomerId}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{customer.stripeName || "Unknown"}</span>
                    <Badge 
                      variant={customer.subscriptionStatus === "active" ? "default" : "secondary"}
                      className={customer.subscriptionStatus === "trialing" ? "bg-amber-100 text-amber-700" : ""}
                    >
                      {customer.subscriptionStatus}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">{customer.email}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{formatCurrency(customer.monthlyAmount)}/mo</div>
                  {customer.currentPeriodEnd && (
                    <div className="text-xs text-muted-foreground">
                      Bills {customer.currentPeriodEnd.toLocaleDateString()}
                    </div>
                  )}
                </div>
                {customer.unbilledSnapshot && (
                  <div className="ml-4 text-right border-l pl-4">
                    <div className="text-sm text-muted-foreground">Current Unbilled</div>
                    <div className="font-bold text-emerald-700">
                      {formatCurrency(customer.unbilledSnapshot.totalBill)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {customer.unbilledSnapshot.overageUnits.toLocaleString()} units
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function StripePage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Stripe Data</h1>
        <p className="text-muted-foreground">
          Raw Stripe customer and subscription data
        </p>
      </div>

      <Suspense fallback={<div className="h-96 bg-muted animate-pulse rounded" />}>
        <StripeContent />
      </Suspense>
    </div>
  );
}
