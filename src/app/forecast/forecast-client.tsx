"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/revenue";
import { ForecastChart } from "./forecast-chart";
import { format, addMonths } from "date-fns";

interface ForecastClientProps {
  baseline: {
    currentMRR: number;
    payroll: number;
    activeCustomers: number;
    avgShipments: number;
    avgBaseFee: number;
  };
}

export function ForecastClient({ baseline }: ForecastClientProps) {
  const [defaultShipments, setDefaultShipments] = useState(baseline.avgShipments || 3000);
  const [defaultBaseFee, setDefaultBaseFee] = useState(baseline.avgBaseFee || 214);
  const [monthlyGrowth, setMonthlyGrowth] = useState([3, 3, 3, 3, 3, 3]);

  const projections = useMemo(() => {
    const data = [];
    let cumulativeCustomers = baseline.activeCustomers;
    let cumulativeRevenue = baseline.currentMRR;
    const now = new Date();

    for (let i = 0; i < 6; i++) {
      const monthDate = addMonths(now, i);
      const monthLabel = format(monthDate, "MMM yyyy");
      const newCustomers = monthlyGrowth[i] || 0;
      
      // Add new customer revenue (simplified: base fee + estimated overage)
      const newCustomerRevenue = newCustomers * defaultBaseFee;
      
      if (i === 0) {
        // Current month - use actual data
        data.push({
          month: monthLabel,
          revenue: baseline.currentMRR,
          payroll: baseline.payroll,
          profit: baseline.currentMRR - baseline.payroll,
          customers: baseline.activeCustomers,
        });
      } else {
        cumulativeCustomers += newCustomers;
        cumulativeRevenue += newCustomerRevenue;
        
        data.push({
          month: monthLabel,
          revenue: cumulativeRevenue,
          payroll: baseline.payroll, // Assume constant payroll for now
          profit: cumulativeRevenue - baseline.payroll,
          customers: cumulativeCustomers,
        });
      }
    }

    return data;
  }, [baseline, defaultBaseFee, monthlyGrowth]);

  const totals = useMemo(() => {
    const totalRevenue = projections.reduce((sum, p) => sum + p.revenue, 0);
    const totalProfit = projections.reduce((sum, p) => sum + p.profit, 0);
    const finalCustomers = projections[projections.length - 1]?.customers ?? baseline.activeCustomers;
    return { totalRevenue, totalProfit, finalCustomers };
  }, [projections, baseline.activeCustomers]);

  const handleGrowthChange = (index: number, value: string) => {
    const num = parseInt(value) || 0;
    setMonthlyGrowth((prev) => {
      const next = [...prev];
      next[index] = num;
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Growth Assumptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="defaultShipments">Avg Shipments/Customer</Label>
              <Input
                id="defaultShipments"
                type="number"
                value={defaultShipments}
                onChange={(e) => setDefaultShipments(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultBaseFee">Default Base Fee ($)</Label>
              <Input
                id="defaultBaseFee"
                type="number"
                value={defaultBaseFee}
                onChange={(e) => setDefaultBaseFee(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>New Customers Per Month</Label>
            <div className="grid gap-2 md:grid-cols-6">
              {monthlyGrowth.map((value, index) => {
                const monthDate = addMonths(new Date(), index);
                const monthLabel = format(monthDate, "MMM");
                return (
                  <div key={index} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{monthLabel}</Label>
                    <Input
                      type="number"
                      value={value}
                      onChange={(e) => handleGrowthChange(index, e.target.value)}
                      min={0}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>6-Month Projection</CardTitle>
        </CardHeader>
        <CardContent>
          <ForecastChart data={projections} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              6-Month Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              6-Month Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totals.totalProfit < 0 ? "text-destructive" : "text-green-600"}`}>
              {formatCurrency(totals.totalProfit)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Projected Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.finalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              +{totals.finalCustomers - baseline.activeCustomers} from today
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

