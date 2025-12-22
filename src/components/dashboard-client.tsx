"use client";

import { useState, useCallback } from "react";
import { DashboardCards } from "@/components/dashboard-cards";
import { SortableRevenueTable } from "@/components/sortable-revenue-table";
import { CustomerRevenueData } from "@/app/dashboard-row";

interface DashboardClientProps {
  totalMRR: number;
  payroll: number;
  activeCustomers: number;
  revenueData: CustomerRevenueData[];
  pricingIds: Record<string, string>;
  month: string;
}

export function DashboardClient({
  totalMRR,
  payroll,
  activeCustomers,
  revenueData,
  pricingIds,
  month,
}: DashboardClientProps) {
  const [isFiltered, setIsFiltered] = useState(false);
  const [filteredMRR, setFilteredMRR] = useState(totalMRR);
  const [filteredCount, setFilteredCount] = useState(activeCustomers);

  const handleInclusionChange = useCallback((includedIds: Set<string>, mrr: number) => {
    const isNowFiltered = includedIds.size !== revenueData.length;
    setIsFiltered(isNowFiltered);
    setFilteredMRR(mrr);
    setFilteredCount(includedIds.size);
  }, [revenueData.length]);

  return (
    <>
      <DashboardCards
        totalMRR={totalMRR}
        payroll={payroll}
        activeCustomers={activeCustomers}
        isFiltered={isFiltered}
        filteredMRR={filteredMRR}
        filteredCount={filteredCount}
      />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Customer Revenue Breakdown</h2>
        <SortableRevenueTable
          revenueData={revenueData}
          pricingIds={pricingIds}
          month={month}
          onInclusionChange={handleInclusionChange}
        />
      </div>
    </>
  );
}

