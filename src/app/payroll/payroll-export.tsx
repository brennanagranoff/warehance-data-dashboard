"use client";

import { ExportButton } from "@/components/export-button";
import { arrayToCSV } from "@/lib/export";

interface PayrollExportProps {
  payroll: {
    month: string;
    amount: number;
    notes: string | null;
  }[];
}

export function PayrollExport({ payroll }: PayrollExportProps) {
  const data = payroll.map((p) => ({
    month: p.month,
    amount: p.amount,
    notes: p.notes ?? "",
  }));

  const csv = arrayToCSV(data, [
    { key: "month", header: "Month" },
    { key: "amount", header: "Amount" },
    { key: "notes", header: "Notes" },
  ]);

  return <ExportButton data={csv} filename="payroll.csv" />;
}

