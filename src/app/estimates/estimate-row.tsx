"use client";

import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { InlineEdit } from "@/components/inline-edit";
import { InlineTextEdit } from "@/components/inline-text-edit";
import { upsertEstimate } from "@/actions/estimates";

interface EstimateRowProps {
  customerId: string;
  customerName: string;
  status: string;
  estimate: {
    id: string;
    estimatedShipments: number;
    notes: string | null;
  } | null;
  month: string;
}

export function EstimateRow({
  customerId,
  customerName,
  status,
  estimate,
  month,
}: EstimateRowProps) {
  const handleUpdateShipments = async (value: number) => {
    await upsertEstimate({
      customerId,
      month,
      estimatedShipments: value,
      notes: estimate?.notes,
    });
  };

  const handleUpdateNotes = async (value: string) => {
    await upsertEstimate({
      customerId,
      month,
      estimatedShipments: estimate?.estimatedShipments ?? 0,
      notes: value || null,
    });
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{customerName}</TableCell>
      <TableCell>
        <Badge
          variant={
            status === "Active" ? "default" : status === "Trial" ? "secondary" : "outline"
          }
        >
          {status}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <InlineEdit
          value={estimate?.estimatedShipments ?? 0}
          onSave={handleUpdateShipments}
          format="number"
        />
      </TableCell>
      <TableCell>
        <InlineTextEdit
          value={estimate?.notes ?? ""}
          onSave={handleUpdateNotes}
          placeholder="Add notes..."
        />
      </TableCell>
    </TableRow>
  );
}

