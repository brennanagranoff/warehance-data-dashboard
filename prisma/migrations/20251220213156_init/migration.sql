-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Prospect',
    "closedDate" DATETIME,
    "owner" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Pricing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "baseFee" REAL NOT NULL DEFAULT 0,
    "includedShipments" INTEGER NOT NULL DEFAULT 0,
    "overageRate" REAL NOT NULL DEFAULT 0,
    "labelFeeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "labelFeeRate" REAL NOT NULL DEFAULT 0.035,
    CONSTRAINT "Pricing_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MonthlyEstimate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "estimatedShipments" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "MonthlyEstimate_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payroll" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "personName" TEXT NOT NULL,
    "monthlyCost" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Pricing_customerId_key" ON "Pricing"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyEstimate_customerId_month_key" ON "MonthlyEstimate"("customerId", "month");
