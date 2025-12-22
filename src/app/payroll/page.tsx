import { db } from "@/lib/db";
import { PayrollDialog } from "@/components/payroll-dialog";
import { DeleteButton } from "@/components/delete-button";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deletePayroll } from "@/actions/payroll";
import { Pencil } from "lucide-react";
import { format, parse } from "date-fns";
import { formatCurrency, getCurrentMonth } from "@/lib/revenue";
import { PayrollExport } from "./payroll-export";
import { PayrollRow } from "./payroll-row";

async function getPayroll() {
  return db.payroll.findMany({
    orderBy: { month: "desc" },
  });
}

export default async function PayrollPage() {
  const payrollData = await getPayroll();
  const currentMonth = getCurrentMonth();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payroll</h1>
          <p className="text-muted-foreground">Track monthly payroll expenses</p>
        </div>
        <div className="flex gap-2">
          <PayrollExport payroll={payrollData} />
          <PayrollDialog defaultMonth={currentMonth} />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payrollData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No payroll entries yet. Add your first entry above.
                </TableCell>
              </TableRow>
            ) : (
              payrollData.map((payroll) => (
                <PayrollRow key={payroll.id} payroll={payroll} />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

