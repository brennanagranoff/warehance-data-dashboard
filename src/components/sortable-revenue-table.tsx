"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardRow, CustomerRevenueData } from "@/app/dashboard-row";
import { formatCurrency } from "@/lib/revenue";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

type SortField = "name" | "status" | "shipments" | "baseFee" | "overageRevenue" | "labelRevenue" | "totalRevenue" | "labelPercent";
type SortDirection = "asc" | "desc" | null;

interface SortableRevenueTableProps {
  revenueData: CustomerRevenueData[];
  pricingIds: Record<string, string>;
  month: string;
  onInclusionChange?: (includedIds: Set<string>, filteredMRR: number) => void;
}

export function SortableRevenueTable({ 
  revenueData, 
  pricingIds, 
  month, 
  onInclusionChange 
}: SortableRevenueTableProps) {
  const [sortField, setSortField] = useState<SortField>("totalRevenue");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [includedCustomers, setIncludedCustomers] = useState<Set<string>>(
    () => new Set(revenueData.map(c => c.customerId))
  );

  // Update included customers when revenue data changes
  useEffect(() => {
    setIncludedCustomers(new Set(revenueData.map(c => c.customerId)));
  }, [revenueData]);

  const sortedData = useMemo(() => {
    if (!sortDirection) return revenueData;

    return [...revenueData].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortField) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "status":
          aVal = a.status.toLowerCase();
          bVal = b.status.toLowerCase();
          break;
        case "shipments":
          aVal = a.estimatedShipments;
          bVal = b.estimatedShipments;
          break;
        case "baseFee":
          aVal = a.baseFee;
          bVal = b.baseFee;
          break;
        case "overageRevenue":
          aVal = a.overageRevenue;
          bVal = b.overageRevenue;
          break;
        case "labelRevenue":
          aVal = a.labelRevenue;
          bVal = b.labelRevenue;
          break;
        case "totalRevenue":
          aVal = a.totalRevenue;
          bVal = b.totalRevenue;
          break;
        case "labelPercent":
          aVal = a.labelFeePercentage;
          bVal = b.labelFeePercentage;
          break;
        default:
          return 0;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      
      return sortDirection === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [revenueData, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") setSortDirection(null);
      else setSortDirection("asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleToggleInclude = useCallback((customerId: string, include: boolean) => {
    setIncludedCustomers(prev => {
      const next = new Set(prev);
      if (include) {
        next.add(customerId);
      } else {
        next.delete(customerId);
      }
      return next;
    });
  }, []);

  // Calculate totals based on included customers only
  const totals = useMemo(() => {
    const included = revenueData.filter(c => includedCustomers.has(c.customerId));
    return {
      shipments: included.reduce((sum, c) => sum + c.estimatedShipments, 0),
      baseFee: included.reduce((sum, c) => sum + c.baseFee, 0),
      overageRevenue: included.reduce((sum, c) => sum + c.overageRevenue, 0),
      labelRevenue: included.reduce((sum, c) => sum + c.labelRevenue, 0),
      totalRevenue: included.reduce((sum, c) => sum + c.totalRevenue, 0),
    };
  }, [revenueData, includedCustomers]);

  // Notify parent of inclusion changes
  useEffect(() => {
    onInclusionChange?.(includedCustomers, totals.totalRevenue);
  }, [includedCustomers, totals.totalRevenue, onInclusionChange]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field || !sortDirection) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="ml-1 h-3 w-3" /> 
      : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const headerClass = "cursor-pointer select-none hover:bg-muted/50 transition-colors";

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">
              <span className="text-xs text-muted-foreground">
                {includedCustomers.size}/{revenueData.length}
              </span>
            </TableHead>
            <TableHead className={cn(headerClass)} onClick={() => handleSort("name")}>
              <div className="flex items-center">
                Customer
                <SortIcon field="name" />
              </div>
            </TableHead>
            <TableHead className={cn(headerClass)} onClick={() => handleSort("status")}>
              <div className="flex items-center">
                Status
                <SortIcon field="status" />
              </div>
            </TableHead>
            <TableHead className={cn(headerClass, "text-right")} onClick={() => handleSort("shipments")}>
              <div className="flex items-center justify-end">
                Shipments
                <SortIcon field="shipments" />
              </div>
            </TableHead>
            <TableHead className={cn(headerClass, "text-right")} onClick={() => handleSort("baseFee")}>
              <div className="flex items-center justify-end">
                Base Fee
                <SortIcon field="baseFee" />
              </div>
            </TableHead>
            <TableHead className={cn(headerClass, "text-right")} onClick={() => handleSort("overageRevenue")}>
              <div className="flex items-center justify-end">
                Overage
                <SortIcon field="overageRevenue" />
              </div>
            </TableHead>
            <TableHead className="text-center">Labels</TableHead>
            <TableHead className={cn(headerClass, "text-right")} onClick={() => handleSort("labelPercent")}>
              <div className="flex items-center justify-end">
                Label %
                <SortIcon field="labelPercent" />
              </div>
            </TableHead>
            <TableHead className={cn(headerClass, "text-right")} onClick={() => handleSort("labelRevenue")}>
              <div className="flex items-center justify-end">
                Label Rev
                <SortIcon field="labelRevenue" />
              </div>
            </TableHead>
            <TableHead className={cn(headerClass, "text-right")} onClick={() => handleSort("totalRevenue")}>
              <div className="flex items-center justify-end">
                Total
                <SortIcon field="totalRevenue" />
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((customer) => (
            <DashboardRow
              key={customer.customerId}
              customer={customer}
              pricingId={pricingIds[customer.customerId]}
              month={month}
              isIncluded={includedCustomers.has(customer.customerId)}
              onToggleInclude={(include) => handleToggleInclude(customer.customerId, include)}
            />
          ))}
          <TableRow className="bg-muted/50 font-medium">
            <TableCell></TableCell>
            <TableCell>Total ({includedCustomers.size} customers)</TableCell>
            <TableCell></TableCell>
            <TableCell className="text-right">{totals.shipments.toLocaleString()}</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.baseFee)}</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.overageRevenue)}</TableCell>
            <TableCell></TableCell>
            <TableCell></TableCell>
            <TableCell className="text-right">{formatCurrency(totals.labelRevenue)}</TableCell>
            <TableCell className="text-right font-bold">{formatCurrency(totals.totalRevenue)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

