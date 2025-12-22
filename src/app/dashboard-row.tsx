"use client";

import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { InlineEdit } from "@/components/inline-edit";
import { ToggleSwitch } from "@/components/toggle-switch";
import { formatCurrency } from "@/lib/revenue";
import { updatePricing } from "@/actions/pricing";
import { upsertEstimate } from "@/actions/estimates";
import { cn } from "@/lib/utils";

export interface CustomerRevenueData {
  customerId: string;
  name: string;
  status: string;
  estimatedShipments: number;
  baseFee: number;
  overageRevenue: number;
  labelRevenue: number;
  totalRevenue: number;
  labelFeeEnabled: boolean;
  labelFeeRate: number;
  labelFeePercentage: number;
}

interface DashboardRowProps {
  customer: CustomerRevenueData;
  pricingId: string;
  month: string;
  isIncluded: boolean;
  onToggleInclude: (include: boolean) => void;
}

export function DashboardRow({ customer, pricingId, month, isIncluded, onToggleInclude }: DashboardRowProps) {
  const handleUpdateShipments = async (value: number) => {
    await upsertEstimate({
      customerId: customer.customerId,
      month,
      estimatedShipments: value,
    });
  };

  const handleUpdateBaseFee = async (value: number) => {
    await updatePricing(pricingId, { baseFee: value });
  };

  const handleToggleLabels = async (enabled: boolean) => {
    await updatePricing(pricingId, { labelFeeEnabled: enabled });
  };

  const handleUpdateLabelRate = async (value: number) => {
    await updatePricing(pricingId, { labelFeeRate: value });
  };

  const handleUpdateLabelPercentage = async (value: number) => {
    await updatePricing(pricingId, { labelFeePercentage: value });
  };

  return (
    <TableRow className={cn(!isIncluded && "opacity-40")}>
      <TableCell>
        <ToggleSwitch
          value={isIncluded}
          onToggle={async (v) => onToggleInclude(v)}
          size="sm"
        />
      </TableCell>
      <TableCell className="font-medium">{customer.name}</TableCell>
      <TableCell>
        <Badge variant={customer.status === "Active" ? "default" : customer.status === "Trial" ? "secondary" : "outline"}>
          {customer.status}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <InlineEdit
          value={customer.estimatedShipments}
          onSave={handleUpdateShipments}
          format="number"
        />
      </TableCell>
      <TableCell className="text-right">
        <InlineEdit
          value={customer.baseFee}
          onSave={handleUpdateBaseFee}
          format="currency"
        />
      </TableCell>
      <TableCell className="text-right">{formatCurrency(customer.overageRevenue)}</TableCell>
      <TableCell className="text-center">
        <ToggleSwitch
          value={customer.labelFeeEnabled}
          onToggle={handleToggleLabels}
        />
      </TableCell>
      <TableCell className="text-right">
        <InlineEdit
          value={customer.labelFeePercentage}
          onSave={handleUpdateLabelPercentage}
          format="percent"
        />
      </TableCell>
      <TableCell className="text-right">{formatCurrency(customer.labelRevenue)}</TableCell>
      <TableCell className="text-right font-medium">{formatCurrency(customer.totalRevenue)}</TableCell>
    </TableRow>
  );
}

