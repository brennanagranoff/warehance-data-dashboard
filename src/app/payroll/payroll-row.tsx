"use client";

import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { InlineEdit } from "@/components/inline-edit";
import { InlineTextEdit } from "@/components/inline-text-edit";
import { DeleteButton } from "@/components/delete-button";
import { PayrollDialog } from "@/components/payroll-dialog";
import { updatePayroll, deletePayroll } from "@/actions/payroll";
import { Pencil } from "lucide-react";
import { format, parse } from "date-fns";

interface PayrollRowProps {
  payroll: {
    id: string;
    month: string;
    amount: number;
    notes: string | null;
  };
}

export function PayrollRow({ payroll }: PayrollRowProps) {
  const monthDate = parse(payroll.month, "yyyy-MM", new Date());
  const formattedMonth = format(monthDate, "MMMM yyyy");

  return (
    <TableRow>
      <TableCell className="font-medium">{formattedMonth}</TableCell>
      <TableCell className="text-right">
        <InlineEdit
          value={payroll.amount}
          onSave={async (value) => {
            await updatePayroll(payroll.id, { amount: value });
          }}
          format="currency"
        />
      </TableCell>
      <TableCell>
        <InlineTextEdit
          value={payroll.notes ?? ""}
          onSave={async (value) => {
            await updatePayroll(payroll.id, { notes: value || null });
          }}
          placeholder="Add notes..."
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <PayrollDialog
            payroll={payroll}
            trigger={
              <Button variant="ghost" size="icon">
                <Pencil className="h-4 w-4" />
              </Button>
            }
          />
          <DeleteButton
            onDelete={async () => {
              await deletePayroll(payroll.id);
            }}
            itemName="Payroll Entry"
          />
        </div>
      </TableCell>
    </TableRow>
  );
}

