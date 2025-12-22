import { db } from "@/lib/db";
import { CustomerDialog } from "@/components/customer-dialog";
import { DeleteButton } from "@/components/delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteCustomer } from "@/actions/customers";
import { Pencil } from "lucide-react";
import { format } from "date-fns";
import { CustomerExport } from "./customer-export";

async function getCustomers() {
  return db.customer.findMany({
    include: {
      pricing: true,
    },
    orderBy: { name: "asc" },
  });
}

export default async function CustomersPage() {
  const customers = await getCustomers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Manage your customer list</p>
        </div>
        <div className="flex gap-2">
          <CustomerExport customers={customers} />
          <CustomerDialog />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Base Fee</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No customers yet. Add your first customer above.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        customer.status === "Active"
                          ? "default"
                          : customer.status === "Trial"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {customer.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {customer.startDate
                      ? format(customer.startDate, "MMM d, yyyy")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    ${customer.pricing?.baseFee?.toLocaleString() ?? "0"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <CustomerDialog
                        customer={{
                          id: customer.id,
                          name: customer.name,
                          status: customer.status,
                          startDate: customer.startDate,
                        }}
                        trigger={
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <DeleteButton
                        onDelete={async () => {
                          "use server";
                          await deleteCustomer(customer.id);
                        }}
                        itemName="Customer"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

