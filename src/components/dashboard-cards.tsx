"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/revenue";
import { DollarSign, Users, Wallet, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardCardsProps {
  totalMRR: number;
  payroll: number;
  activeCustomers: number;
  isFiltered?: boolean;
  filteredMRR?: number;
  filteredCount?: number;
}

export function DashboardCards({ 
  totalMRR, 
  payroll, 
  activeCustomers,
  isFiltered = false,
  filteredMRR,
  filteredCount,
}: DashboardCardsProps) {
  const displayMRR = isFiltered ? (filteredMRR ?? totalMRR) : totalMRR;
  const displayCount = isFiltered ? (filteredCount ?? activeCustomers) : activeCustomers;
  const netProfit = displayMRR - payroll;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className={cn(isFiltered && "border-amber-400")}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {isFiltered ? "Filtered MRR" : "Total MRR"}
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(displayMRR)}</div>
          {isFiltered && (
            <p className="text-xs text-amber-600">
              Excluding {activeCustomers - (filteredCount ?? 0)} customers
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Payroll</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(payroll)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold", netProfit < 0 && "text-destructive")}>
            {formatCurrency(netProfit)}
          </div>
        </CardContent>
      </Card>
      <Card className={cn(isFiltered && "border-amber-400")}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{displayCount}</div>
          {isFiltered && (
            <p className="text-xs text-amber-600">
              of {activeCustomers} total
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

