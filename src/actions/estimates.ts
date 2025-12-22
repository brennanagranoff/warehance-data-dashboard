"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

interface UpsertEstimateInput {
  customerId: string;
  month: string;
  estimatedShipments: number;
  notes?: string | null;
}

export async function upsertEstimate(data: UpsertEstimateInput) {
  const estimate = await db.monthlyEstimate.upsert({
    where: {
      customerId_month: {
        customerId: data.customerId,
        month: data.month,
      },
    },
    create: {
      customerId: data.customerId,
      month: data.month,
      estimatedShipments: data.estimatedShipments,
      notes: data.notes,
    },
    update: {
      estimatedShipments: data.estimatedShipments,
      notes: data.notes,
    },
  });

  revalidatePath("/");
  revalidatePath("/estimates");
  return estimate;
}

export async function deleteEstimate(id: string) {
  await db.monthlyEstimate.delete({
    where: { id },
  });

  revalidatePath("/");
  revalidatePath("/estimates");
}

export async function getEstimates(month?: string) {
  return db.monthlyEstimate.findMany({
    where: month ? { month } : undefined,
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

