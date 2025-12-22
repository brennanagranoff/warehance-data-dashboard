"use client";

import { useMemo } from "react";

interface ForecastChartProps {
  data: {
    month: string;
    revenue: number;
    payroll: number;
    profit: number;
    customers: number;
  }[];
}

export function ForecastChart({ data }: ForecastChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) return { bars: [], maxValue: 0 };

    const maxValue = Math.max(
      ...data.map((d) => Math.max(d.revenue, d.payroll, Math.abs(d.profit)))
    );

    return {
      bars: data.map((d) => ({
        ...d,
        revenueHeight: (d.revenue / maxValue) * 100,
        payrollHeight: (d.payroll / maxValue) * 100,
        profitHeight: (Math.abs(d.profit) / maxValue) * 100,
        profitPositive: d.profit >= 0,
      })),
      maxValue,
    };
  }, [data]);

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value}`;
  };

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No data to display
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex h-64 items-end gap-2">
        {chartData.bars.map((bar, index) => (
          <div key={index} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-52 w-full items-end justify-center gap-1">
              {/* Profit bar (green/red) */}
              <div className="flex w-1/3 flex-col items-center">
                <span className="mb-1 text-xs font-medium">
                  {formatCurrency(bar.profit)}
                </span>
                <div
                  className={`w-full rounded-t transition-all ${
                    bar.profitPositive ? "bg-green-500" : "bg-red-500"
                  }`}
                  style={{ height: `${bar.profitHeight}%` }}
                />
              </div>
              {/* Revenue line indicator */}
              <div className="flex w-1/3 flex-col items-center">
                <span className="mb-1 text-xs text-blue-600 font-medium">
                  {formatCurrency(bar.revenue)}
                </span>
                <div
                  className="w-full rounded-t bg-blue-500"
                  style={{ height: `${bar.revenueHeight}%` }}
                />
              </div>
              {/* Payroll indicator */}
              <div className="flex w-1/3 flex-col items-center">
                <span className="mb-1 text-xs text-red-600 font-medium">
                  {formatCurrency(bar.payroll)}
                </span>
                <div
                  className="w-full rounded-t bg-red-300 border-2 border-dashed border-red-500"
                  style={{ height: `${bar.payrollHeight}%` }}
                />
              </div>
            </div>
            <span className="text-xs text-muted-foreground">{bar.month}</span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-green-500" />
          <span>Profit</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-blue-500" />
          <span>Revenue</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded border-2 border-dashed border-red-500 bg-red-300" />
          <span>Payroll</span>
        </div>
      </div>
    </div>
  );
}

