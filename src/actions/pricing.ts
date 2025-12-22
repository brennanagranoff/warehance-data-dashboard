"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

interface UpdatePricingInput {
  baseFee?: number;
  includedShipments?: number;
  overageRate?: number;
  labelFeeEnabled?: boolean;
  labelFeeRate?: number;
  labelFeePercentage?: number;
}

export async function updatePricing(id: string, data: UpdatePricingInput) {
  const pricing = await db.pricing.update({
    where: { id },
    data: {
      baseFee: data.baseFee,
      includedShipments: data.includedShipments,
      overageRate: data.overageRate,
      labelFeeEnabled: data.labelFeeEnabled,
      labelFeeRate: data.labelFeeRate,
      labelFeePercentage: data.labelFeePercentage,
    },
  });

  revalidatePath("/");
  revalidatePath("/pricing");
  return pricing;
}

export async function getPricing() {
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

