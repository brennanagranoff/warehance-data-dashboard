import { db } from "@/lib/db";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PricingRow } from "./pricing-row";

async function getPricingData() {
  return db.pricing.findMany({
    include: {
      customer: true,
    },
    orderBy: {
      customer: {
        name: "asc",
      },
    },
  });
}

export default async function PricingPage() {
  const pricingData = await getPricingData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pricing</h1>
        <p className="text-muted-foreground">Manage customer pricing tiers</p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Base Fee</TableHead>
              <TableHead className="text-right">Included Shipments</TableHead>
              <TableHead className="text-right">Overage Rate</TableHead>
              <TableHead className="text-center">Label Fee</TableHead>
              <TableHead className="text-right">Label Rate</TableHead>
              <TableHead className="text-right">Label %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pricingData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No pricing data. Add customers first.
                </TableCell>
              </TableRow>
            ) : (
              pricingData.map((pricing) => (
                <PricingRow key={pricing.id} pricing={pricing} />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

