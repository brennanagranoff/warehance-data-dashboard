import { Suspense } from "react";
import { db } from "@/lib/db";
import { MonthSelector } from "@/components/month-selector";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCurrentMonth } from "@/lib/revenue";
import { EstimateRow } from "./estimate-row";

async function getEstimatesData(month: string) {
  const customers = await db.customer.findMany({
    where: {
      status: { not: "Inactive" },
    },
    include: {
      monthlyEstimates: {
        where: { month },
      },
    },
    orderBy: { name: "asc" },
  });

  return customers.map((customer) => ({
    customerId: customer.id,
    customerName: customer.name,
    status: customer.status,
    estimate: customer.monthlyEstimates[0] ?? null,
  }));
}

interface EstimatesContentProps {
  month: string;
}

async function EstimatesContent({ month }: EstimatesContentProps) {
  const data = await getEstimatesData(month);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Estimated Shipments</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No active customers.
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <EstimateRow
                key={row.customerId}
                customerId={row.customerId}
                customerName={row.customerName}
                status={row.status}
                estimate={row.estimate}
                month={month}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default async function EstimatesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const month = params.month ?? getCurrentMonth();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monthly Estimates</h1>
          <p className="text-muted-foreground">Set shipment estimates for each customer</p>
        </div>
        <Suspense fallback={<div className="w-[180px] h-10 bg-muted animate-pulse rounded" />}>
          <MonthSelector currentMonth={month} />
        </Suspense>
      </div>

      <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded" />}>
        <EstimatesContent month={month} />
      </Suspense>
    </div>
  );
}

