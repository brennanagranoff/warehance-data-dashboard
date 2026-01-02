import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  // Check if we have any customer data
  const existingCustomers = await prisma.customer.count();
  
  if (existingCustomers > 0) {
    console.log(`Database has ${existingCustomers} customers.`);
    console.log("No seeding needed.");
    return;
  }

  console.log("No customers found.");
  console.log("The database is ready for use.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
