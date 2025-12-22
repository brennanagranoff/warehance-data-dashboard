"use client";

import { TableCell, TableRow } from "@/components/ui/table";
import { InlineEdit } from "@/components/inline-edit";
import { ToggleSwitch } from "@/components/toggle-switch";
import { updatePricing } from "@/actions/pricing";

interface PricingRowProps {
  pricing: {
    id: string;
    baseFee: number;
    includedShipments: number;
    overageRate: number;
    labelFeeEnabled: boolean;
    labelFeeRate: number;
    labelFeePercentage: number;
    customer: {
      name: string;
    };
  };
}

export function PricingRow({ pricing }: PricingRowProps) {
  return (
    <TableRow>
      <TableCell className="font-medium">{pricing.customer.name}</TableCell>
      <TableCell className="text-right">
        <InlineEdit
          value={pricing.baseFee}
          onSave={async (value) => {
            await updatePricing(pricing.id, { baseFee: value });
          }}
          format="currency"
        />
      </TableCell>
      <TableCell className="text-right">
        <InlineEdit
          value={pricing.includedShipments}
          onSave={async (value) => {
            await updatePricing(pricing.id, { includedShipments: value });
          }}
          format="number"
        />
      </TableCell>
      <TableCell className="text-right">
        <InlineEdit
          value={pricing.overageRate}
          onSave={async (value) => {
            await updatePricing(pricing.id, { overageRate: value });
          }}
          format="rate"
        />
      </TableCell>
      <TableCell className="text-center">
        <ToggleSwitch
          value={pricing.labelFeeEnabled}
          onToggle={async (value) => {
            await updatePricing(pricing.id, { labelFeeEnabled: value });
          }}
        />
      </TableCell>
      <TableCell className="text-right">
        <InlineEdit
          value={pricing.labelFeeRate}
          onSave={async (value) => {
            await updatePricing(pricing.id, { labelFeeRate: value });
          }}
          format="rate"
        />
      </TableCell>
      <TableCell className="text-right">
        <InlineEdit
          value={pricing.labelFeePercentage}
          onSave={async (value) => {
            await updatePricing(pricing.id, { labelFeePercentage: value });
          }}
          format="percent"
        />
      </TableCell>
    </TableRow>
  );
}

