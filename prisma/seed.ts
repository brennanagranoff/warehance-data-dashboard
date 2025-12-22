import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.monthlyEstimate.deleteMany();
  await prisma.pricing.deleteMany();
  await prisma.payroll.deleteMany();
  await prisma.customer.deleteMany();

  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;

  // Create customers with pricing and estimates
  const customers = [
    { name: "Acme Corp", status: "Active", baseFee: 500, includedShipments: 1000, overageRate: 0.25, labelFeeEnabled: true, labelFeeRate: 0.035, shipments: 1500 },
    { name: "TechStart Inc", status: "Trial", baseFee: 200, includedShipments: 500, overageRate: 0.30, labelFeeEnabled: true, labelFeeRate: 0.035, shipments: 450 },
    { name: "Global Logistics", status: "Active", baseFee: 1500, includedShipments: 5000, overageRate: 0.20, labelFeeEnabled: true, labelFeeRate: 0.035, shipments: 6200 },
    { name: "FastShip LLC", status: "Active", baseFee: 750, includedShipments: 2000, overageRate: 0.22, labelFeeEnabled: true, labelFeeRate: 0.035, shipments: 2100 },
    { name: "E-Commerce Plus", status: "Active", baseFee: 1000, includedShipments: 3000, overageRate: 0.18, labelFeeEnabled: false, labelFeeRate: 0.035, shipments: 2800 },
    { name: "Retail Masters", status: "Trial", baseFee: 300, includedShipments: 800, overageRate: 0.28, labelFeeEnabled: true, labelFeeRate: 0.035, shipments: 650 },
    { name: "Quick Commerce", status: "Active", baseFee: 600, includedShipments: 1500, overageRate: 0.24, labelFeeEnabled: true, labelFeeRate: 0.035, shipments: 1800 },
    { name: "Supply Chain Co", status: "Active", baseFee: 2000, includedShipments: 8000, overageRate: 0.15, labelFeeEnabled: true, labelFeeRate: 0.035, shipments: 7500 },
    { name: "Metro Fulfillment", status: "Active", baseFee: 450, includedShipments: 1200, overageRate: 0.26, labelFeeEnabled: false, labelFeeRate: 0.035, shipments: 1100 },
    { name: "Digital Goods Co", status: "Trial", baseFee: 250, includedShipments: 600, overageRate: 0.32, labelFeeEnabled: true, labelFeeRate: 0.035, shipments: 580 },
    { name: "Warehouse Pro", status: "Active", baseFee: 1200, includedShipments: 4000, overageRate: 0.19, labelFeeEnabled: true, labelFeeRate: 0.035, shipments: 4500 },
    { name: "Ship Fast Inc", status: "Active", baseFee: 800, includedShipments: 2500, overageRate: 0.21, labelFeeEnabled: true, labelFeeRate: 0.035, shipments: 2400 },
    { name: "Order Express", status: "Active", baseFee: 550, includedShipments: 1400, overageRate: 0.25, labelFeeEnabled: false, labelFeeRate: 0.035, shipments: 1350 },
    { name: "Pack & Go", status: "Trial", baseFee: 350, includedShipments: 900, overageRate: 0.27, labelFeeEnabled: true, labelFeeRate: 0.035, shipments: 920 },
    { name: "Logistics Hub", status: "Active", baseFee: 1800, includedShipments: 6000, overageRate: 0.17, labelFeeEnabled: true, labelFeeRate: 0.035, shipments: 5800 },
    { name: "Smart Shipping", status: "Active", baseFee: 650, includedShipments: 1800, overageRate: 0.23, labelFeeEnabled: true, labelFeeRate: 0.035, shipments: 1750 },
    { name: "Prime Logistics", status: "Active", baseFee: 900, includedShipments: 2800, overageRate: 0.20, labelFeeEnabled: true, labelFeeRate: 0.035, shipments: 3000 },
    { name: "Express Delivery", status: "Active", baseFee: 400, includedShipments: 1000, overageRate: 0.28, labelFeeEnabled: false, labelFeeRate: 0.035, shipments: 980 },
    { name: "Fulfillment First", status: "Trial", baseFee: 275, includedShipments: 700, overageRate: 0.30, labelFeeEnabled: true, labelFeeRate: 0.035, shipments: 720 },
    { name: "Cargo Masters", status: "Active", baseFee: 1100, includedShipments: 3500, overageRate: 0.18, labelFeeEnabled: true, labelFeeRate: 0.035, shipments: 3600 },
    { name: "Swift Logistics", status: "Active", baseFee: 700, includedShipments: 2000, overageRate: 0.22, labelFeeEnabled: true, labelFeeRate: 0.035, shipments: 2200 },
    { name: "NextDay Shipping", status: "Active", baseFee: 950, includedShipments: 3000, overageRate: 0.19, labelFeeEnabled: true, labelFeeRate: 0.035, shipments: 2900 },
  ];

  for (const customerData of customers) {
    const customer = await prisma.customer.create({
      data: {
        name: customerData.name,
        status: customerData.status,
        startDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        pricing: {
          create: {
            baseFee: customerData.baseFee,
            includedShipments: customerData.includedShipments,
            overageRate: customerData.overageRate,
            labelFeeEnabled: customerData.labelFeeEnabled,
            labelFeeRate: customerData.labelFeeRate,
            labelFeePercentage: 1.0,
          },
        },
        monthlyEstimates: {
          create: {
            month: currentMonth,
            estimatedShipments: customerData.shipments,
          },
        },
      },
    });
    console.log(`Created customer: ${customer.name}`);
  }

  // Create payroll entry for current month
  await prisma.payroll.create({
    data: {
      month: currentMonth,
      amount: 25000,
      notes: "Monthly payroll",
    },
  });

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

