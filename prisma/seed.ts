import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  // Check if we have any Stripe data
  const existingCustomers = await prisma.stripeCustomer.count();
  
  if (existingCustomers > 0) {
    console.log(`Database has ${existingCustomers} Stripe customers synced.`);
    console.log("No seeding needed - data comes from Stripe.");
    return;
  }

  console.log("No Stripe customers found.");
  console.log("Run a Stripe sync to populate the database with real data.");
  console.log("Visit /stripe and click 'Full Sync' to get started.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
