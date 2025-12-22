"use client";

import { ExportButton } from "@/components/export-button";
import { arrayToCSV } from "@/lib/export";
import { format } from "date-fns";

interface CustomerExportProps {
  customers: {
    id: string;
    name: string;
    status: string;
    startDate: Date | null;
    pricing: {
      baseFee: number;
    } | null;
  }[];
}

export function CustomerExport({ customers }: CustomerExportProps) {
  const data = customers.map((c) => ({
    name: c.name,
    status: c.status,
    startDate: c.startDate ? format(c.startDate, "yyyy-MM-dd") : "",
    baseFee: c.pricing?.baseFee ?? 0,
  }));

  const csv = arrayToCSV(data, [
    { key: "name", header: "Name" },
    { key: "status", header: "Status" },
    { key: "startDate", header: "Start Date" },
    { key: "baseFee", header: "Base Fee" },
  ]);

  return <ExportButton data={csv} filename="customers.csv" />;
}

