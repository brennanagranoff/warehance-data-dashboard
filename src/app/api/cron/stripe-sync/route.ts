import { NextRequest, NextResponse } from "next/server";
import { syncUnbilledAmounts, syncAllInvoices } from "@/lib/stripe-history";
import { syncAllStripeCustomers } from "@/lib/stripe-sync";
import { db } from "@/lib/db";

// This endpoint is designed to be called by a cron job every hour
// You can set this up with:
// - Vercel Cron (if deploying to Vercel)
// - GitHub Actions scheduled workflow
// - External cron service (cron-job.org, etc.)
// - Local cron job: curl http://localhost:3000/api/cron/stripe-sync

export async function GET(request: NextRequest) {
  // Optional: Verify cron secret for security
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const job = await db.syncJob.create({
      data: {
        type: "hourly",
        status: "running",
        startedAt: new Date(),
      },
    });

    // Sync customers (quick)
    const customerResult = await syncAllStripeCustomers();

    // Sync unbilled amounts (invoice previews)
    const unbilledResult = await syncUnbilledAmounts();

    // Sync any new invoices
    const invoiceResult = await syncAllInvoices();

    const stats = {
      customers: customerResult,
      unbilled: unbilledResult,
      invoices: invoiceResult,
      timestamp: new Date().toISOString(),
    };

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
      ...stats,
    });
  } catch (error) {
    console.error("Cron sync error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also allow POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
