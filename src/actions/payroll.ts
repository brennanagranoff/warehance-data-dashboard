"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

interface CreatePayrollInput {
  month: string;
  amount: number;
  notes?: string | null;
}

interface UpdatePayrollInput {
  amount?: number;
  notes?: string | null;
}

export async function createPayroll(data: CreatePayrollInput) {
  const payroll = await db.payroll.create({
    data: {
      month: data.month,
      amount: data.amount,
      notes: data.notes,
    },
  });

  revalidatePath("/");
  revalidatePath("/payroll");
  return payroll;
}

export async function updatePayroll(id: string, data: UpdatePayrollInput) {
  const payroll = await db.payroll.update({
    where: { id },
    data: {
      amount: data.amount,
      notes: data.notes,
    },
  });

  revalidatePath("/");
  revalidatePath("/payroll");
  return payroll;
}

export async function deletePayroll(id: string) {
  await db.payroll.delete({
    where: { id },
  });

  revalidatePath("/");
  revalidatePath("/payroll");
}

export async function getPayroll(month?: string) {
  if (month) {
    return db.payroll.findUnique({
      where: { month },
    });
  }
  return db.payroll.findMany({
    orderBy: { month: "desc" },
  });
}

