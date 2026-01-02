"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Calendar,
  DollarSign,
  Flame,
  Snowflake,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import type { CustomerProjection, DayBilling } from "@/lib/revenue-projections";
import { formatCurrency } from "@/lib/revenue-projections";

interface RevenueTimelineProps {
  billingCalendar: DayBilling[];
  projectedTotal: number;
}

export function RevenueTimeline({ billingCalendar, projectedTotal }: RevenueTimelineProps) {
  // Calculate running totals
  let runningTotal = 0;
  const timelineWithTotals = billingCalendar.map((day) => {
    runningTotal += day.totalAmount;
    return {
      ...day,
      runningTotal,
      percentOfTotal: (runningTotal / projectedTotal) * 100,
    };
  });

  if (timelineWithTotals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Bills
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No upcoming bills in this period
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Billing Timeline
          </CardTitle>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Projected Total</div>
            <div className="text-xl font-bold text-emerald-700">{formatCurrency(projectedTotal)}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {timelineWithTotals.map((day, index) => {
          const formattedDate = new Date(day.date).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          });
          
          const isToday = new Date().toISOString().slice(0, 10) === day.dateKey;
          const isPast = new Date(day.date) < new Date(new Date().toISOString().slice(0, 10));
          
          return (
            <div 
              key={day.dateKey}
              className={`
                relative p-4 rounded-lg border transition-all
                ${isToday ? "bg-blue-50 border-blue-300 shadow-sm" : "bg-white hover:bg-gray-50"}
                ${isPast ? "opacity-60" : ""}
              `}
            >
              {/* Timeline connector */}
              {index < timelineWithTotals.length - 1 && (
                <div className="absolute left-6 top-16 w-0.5 h-6 bg-gray-200" />
              )}
              
              <div className="flex items-start gap-4">
                {/* Date circle */}
                <div className={`
                  flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold
                  ${isToday ? "bg-blue-600 text-white" : "bg-emerald-100 text-emerald-700"}
                `}>
                  {day.dayOfMonth}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formattedDate}</span>
                      {isToday && (
                        <Badge variant="default" className="bg-blue-600">Today</Badge>
                      )}
                      <Badge variant="secondary">{day.customerCount} customer{day.customerCount !== 1 ? "s" : ""}</Badge>
                    </div>
                    <span className="text-lg font-bold text-emerald-700">
                      {formatCurrency(day.totalAmount)}
                    </span>
                  </div>
                  
                  {/* Customer list (collapsed) */}
                  <div className="text-sm text-muted-foreground">
                    {day.customers.slice(0, 3).map((c, i) => (
                      <span key={c.stripeCustomerId}>
                        {c.customerName}
                        {i < Math.min(day.customers.length, 3) - 1 && ", "}
                      </span>
                    ))}
                    {day.customers.length > 3 && (
                      <span> +{day.customers.length - 3} more</span>
                    )}
                  </div>
                  
                  {/* Running total progress */}
                  <div className="mt-2 flex items-center gap-2">
                    <Progress value={day.percentOfTotal} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatCurrency(day.runningTotal)} ({Math.round(day.percentOfTotal)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

interface CustomerCardsProps {
  customers: CustomerProjection[];
}

type SortColumn = "customer" | "bills" | "shipments" | "projectedShipments" | "current" | "projected" | "pace" | "progress";
type SortDirection = "asc" | "desc";

export function CustomerCards({ customers }: CustomerCardsProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("projected");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const sortedCustomers = [...customers].sort((a, b) => {
    let comparison = 0;
    switch (sortColumn) {
      case "customer":
        comparison = a.customerName.localeCompare(b.customerName);
        break;
      case "bills":
        comparison = a.periodEnd.getTime() - b.periodEnd.getTime();
        break;
      case "shipments":
        comparison = a.currentOverageUnits - b.currentOverageUnits;
        break;
      case "projectedShipments":
        comparison = a.paceProjectedUnits - b.paceProjectedUnits;
        break;
      case "current":
        comparison = a.currentTotal - b.currentTotal;
        break;
      case "projected":
        comparison = a.paceProjectedTotal - b.paceProjectedTotal;
        break;
      case "pace":
        comparison = a.paceVsHistoricalPercent - b.paceVsHistoricalPercent;
        break;
      case "progress":
        comparison = a.progressPercent - b.progressPercent;
        break;
    }
    return sortDirection === "asc" ? comparison : -comparison;
  });

  const SortHeader = ({ column, children, align = "left" }: { column: SortColumn; children: React.ReactNode; align?: "left" | "right" | "center" }) => {
    const isActive = sortColumn === column;
    return (
      <th
        onClick={() => handleSort(column)}
        className={`font-medium px-3 py-2 cursor-pointer hover:bg-muted/70 transition-colors select-none
          ${align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left"}
          ${column === "customer" ? "px-4" : ""}
          ${column === "progress" ? "w-24" : ""}
        `}
      >
        <span className="inline-flex items-center gap-1">
          {children}
          {isActive ? (
            sortDirection === "asc" ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-30" />
          )}
        </span>
      </th>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-4 w-4" />
          Customer Projections ({customers.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-y">
              <tr>
                <SortHeader column="customer">Customer</SortHeader>
                <SortHeader column="bills">Bills</SortHeader>
                <SortHeader column="shipments" align="right">Shipments</SortHeader>
                <SortHeader column="projectedShipments" align="right">Proj. Ships</SortHeader>
                <SortHeader column="current" align="right">Current</SortHeader>
                <SortHeader column="projected" align="right">Projected</SortHeader>
                <SortHeader column="pace" align="right">Pace</SortHeader>
                <SortHeader column="progress" align="center">Progress</SortHeader>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedCustomers.map((customer) => {
                const billDate = customer.periodEnd.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
                
                const paceColor = customer.paceVsHistorical === "hot" 
                  ? "text-orange-600"
                  : customer.paceVsHistorical === "cold"
                  ? "text-blue-600"
                  : "text-gray-500";
                
                const paceIcon = customer.paceVsHistorical === "hot" 
                  ? <Flame className="h-3 w-3 inline" />
                  : customer.paceVsHistorical === "cold"
                  ? <Snowflake className="h-3 w-3 inline" />
                  : null;

                return (
                  <tr key={customer.stripeCustomerId} className="hover:bg-muted/30">
                    <td className="px-4 py-2">
                      <div className="font-medium truncate max-w-[200px]">{customer.customerName}</div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                      {billDate}
                      <span className="text-xs ml-1">({customer.daysRemaining}d)</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {customer.currentOverageUnits.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {customer.paceProjectedUnits.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      {formatCurrency(customer.currentTotal)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-emerald-700">
                      {formatCurrency(customer.paceProjectedTotal)}
                    </td>
                    <td className={`px-3 py-2 text-right text-xs font-medium ${paceColor}`}>
                      {paceIcon}
                      {customer.paceVsHistorical !== "normal" && (
                        <span className="ml-1">
                          {customer.paceVsHistorical === "hot" ? "+" : ""}
                          {Math.round(customer.paceVsHistoricalPercent)}%
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Progress value={customer.progressPercent} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground w-8">{customer.progressPercent}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

interface ComparisonCardsProps {
  projectedRevenue: number;
  collectedRevenue: number;
  momRevenue: number | null;
  yoyRevenue: number | null;
  currentMonth: string;
}

export function ComparisonCards({ projectedRevenue, collectedRevenue, momRevenue, yoyRevenue, currentMonth }: ComparisonCardsProps) {
  const [year, month] = currentMonth.split("-").map(Number);
  const monthName = new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "short" });
  
  // Calculate previous month name
  const prevMonthDate = new Date(year, month - 2, 1);
  const prevMonthName = prevMonthDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const lastYearMonthName = new Date(year - 1, month - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Current Month Projected */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {monthName} {year} (Projected)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(projectedRevenue)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {formatCurrency(collectedRevenue)} collected
          </div>
        </CardContent>
      </Card>

      {/* Month over Month */}
      <ComparisonCard
        label="Month over Month"
        currentRevenue={projectedRevenue}
        comparisonRevenue={momRevenue}
        comparisonLabel={prevMonthName}
      />

      {/* Year over Year */}
      <ComparisonCard
        label="Year over Year"
        currentRevenue={projectedRevenue}
        comparisonRevenue={yoyRevenue}
        comparisonLabel={lastYearMonthName}
      />
    </div>
  );
}

interface ComparisonCardProps {
  label: string;
  currentRevenue: number;
  comparisonRevenue: number | null;
  comparisonLabel: string;
}

function ComparisonCard({ label, currentRevenue, comparisonRevenue, comparisonLabel }: ComparisonCardProps) {
  if (comparisonRevenue === null) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-sm">
            No data for {comparisonLabel}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const change = currentRevenue - comparisonRevenue;
  const changePercent = comparisonRevenue > 0 ? (change / comparisonRevenue) * 100 : 0;
  const isPositive = change >= 0;
  
  return (
    <Card className={isPositive ? "border-green-200" : "border-red-200"}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {label}
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-xl font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}>
          {isPositive ? "+" : ""}{formatCurrency(change)}
        </div>
        <div className="text-sm text-muted-foreground">
          {isPositive ? "+" : ""}{changePercent.toFixed(1)}% vs {comparisonLabel}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          {comparisonLabel}: {formatCurrency(comparisonRevenue)}
        </div>
      </CardContent>
    </Card>
  );
}

// Keep the old export for backwards compatibility
export function YoYComparisonCard({ currentRevenue, lastYearRevenue, currentMonth }: {
  currentRevenue: number;
  lastYearRevenue: number | null;
  currentMonth: string;
}) {
  const [year, month] = currentMonth.split("-").map(Number);
  const lastYearMonthName = new Date(year - 1, month - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  
  return (
    <ComparisonCard
      label="Year over Year"
      currentRevenue={currentRevenue}
      comparisonRevenue={lastYearRevenue}
      comparisonLabel={lastYearMonthName}
    />
  );
}

