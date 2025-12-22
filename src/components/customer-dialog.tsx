"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusSelect } from "./status-select";
import { Plus, Pencil } from "lucide-react";
import { createCustomer, updateCustomer } from "@/actions/customers";

interface CustomerDialogProps {
  customer?: {
    id: string;
    name: string;
    status: string;
    startDate: Date | null;
  };
  trigger?: React.ReactNode;
}

export function CustomerDialog({ customer, trigger }: CustomerDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(customer?.name ?? "");
  const [status, setStatus] = useState(customer?.status ?? "Active");
  const [startDate, setStartDate] = useState(
    customer?.startDate ? customer.startDate.toISOString().split("T")[0] : ""
  );
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = !!customer;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (isEditing) {
        await updateCustomer(customer.id, { 
          name, 
          status,
          startDate: startDate ? new Date(startDate) : null,
        });
      } else {
        await createCustomer({ 
          name, 
          status,
          startDate: startDate ? new Date(startDate) : null,
        });
      }
      setOpen(false);
      if (!isEditing) {
        setName("");
        setStatus("Active");
        setStartDate("");
      }
    } catch (error) {
      console.error("Failed to save customer:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            {isEditing ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {isEditing ? "Edit" : "Add Customer"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Customer" : "Add New Customer"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Customer name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <StatusSelect value={status} onValueChange={setStatus} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : isEditing ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

