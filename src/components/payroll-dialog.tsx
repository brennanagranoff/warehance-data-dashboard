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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil } from "lucide-react";
import { createPayroll, updatePayroll } from "@/actions/payroll";

interface PayrollDialogProps {
  payroll?: {
    id: string;
    month: string;
    amount: number;
    notes: string | null;
  };
  defaultMonth?: string;
  trigger?: React.ReactNode;
}

export function PayrollDialog({ payroll, defaultMonth, trigger }: PayrollDialogProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(payroll?.month ?? defaultMonth ?? "");
  const [amount, setAmount] = useState(payroll?.amount?.toString() ?? "");
  const [notes, setNotes] = useState(payroll?.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = !!payroll;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const data = {
        month,
        amount: parseFloat(amount),
        notes: notes || null,
      };

      if (isEditing) {
        await updatePayroll(payroll.id, data);
      } else {
        await createPayroll(data);
      }
      setOpen(false);
      if (!isEditing) {
        setMonth(defaultMonth ?? "");
        setAmount("");
        setNotes("");
      }
    } catch (error) {
      console.error("Failed to save payroll:", error);
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
            {isEditing ? "Edit" : "Add Payroll"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Payroll" : "Add Payroll Entry"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="month">Month</Label>
            <Input
              id="month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              required
              disabled={isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="25000"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
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

