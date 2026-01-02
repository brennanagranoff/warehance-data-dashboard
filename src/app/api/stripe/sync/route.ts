import { NextResponse } from "next/server";
import { syncAllStripeCustomers } from "@/lib/stripe-sync";
import { syncUnbilledAmounts, syncAllInvoices } from "@/lib/stripe-history";
import { db } from "@/lib/db";

export async function POST() {
  try {
    // Create a sync job record
    const job = await db.syncJob.create({
      data: {
        type: "quick",
        status: "running",
        startedAt: new Date(),
      },
    });

    // Sync customers
    const customerResult = await syncAllStripeCustomers();
    
    // Sync invoices (this updates collected/paid revenue)
    const invoiceResult = await syncAllInvoices();
    
    // Sync unbilled amounts (this is what updates projections)
    const unbilledResult = await syncUnbilledAmounts();

    const stats = {
      customers: customerResult,
      invoices: invoiceResult,
      unbilled: unbilledResult,
    };

    // Update job as completed
    await db.syncJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        stats: JSON.stringify(stats),
      },
    });

    return NextResponse.json({
      success: true,
      synced: customerResult.synced,
      created: customerResult.created,
      updated: customerResult.updated,
      invoices: invoiceResult.total,
      unbilled: unbilledResult.synced,
    });
  } catch (error) {
    console.error("Stripe sync error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sync with Stripe" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}



