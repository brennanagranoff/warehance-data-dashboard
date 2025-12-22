"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

interface CreateCustomerInput {
  name: string;
  status: string;
  startDate?: Date | null;
}

interface UpdateCustomerInput {
  name?: string;
  status?: string;
  startDate?: Date | null;
}

export async function createCustomer(data: CreateCustomerInput) {
  const customer = await db.customer.create({
    data: {
      name: data.name,
      status: data.status,
      startDate: data.startDate,
      pricing: {
        create: {
          baseFee: 0,
          includedShipments: 0,
          overageRate: 0,
          labelFeeEnabled: false,
          labelFeeRate: 0.035,
          labelFeePercentage: 1.0,
        },
      },
    },
  });

  revalidatePath("/");
  revalidatePath("/customers");
  return customer;
}

export async function updateCustomer(id: string, data: UpdateCustomerInput) {
  const customer = await db.customer.update({
    where: { id },
    data: {
      name: data.name,
      status: data.status,
      startDate: data.startDate,
    },
  });

  revalidatePath("/");
  revalidatePath("/customers");
  return customer;
}

export async function deleteCustomer(id: string) {
  await db.customer.delete({
    where: { id },
  });

  revalidatePath("/");
  revalidatePath("/customers");
}

export async function getCustomers() {
  return db.customer.findMany({
    include: {
      pricing: true,
      monthlyEstimates: true,
    },
    orderBy: { name: "asc" },
  });
}

