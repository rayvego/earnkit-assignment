-- CreateEnum
CREATE TYPE "FeeModelType" AS ENUM ('FREE_TIER', 'CREDIT_BASED');

-- CreateEnum
CREATE TYPE "UsageEventStatus" AS ENUM ('PENDING', 'CAPTURED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TopUpStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- CreateTable
CREATE TABLE "Developer" (
    "id" TEXT NOT NULL,
    "privyId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Developer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "feeModelType" "FeeModelType" NOT NULL,
    "feeModelConfig" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "developerId" TEXT NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBalance" (
    "userWalletAddress" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "ethBalance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "creditBalance" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserBalance_pkey" PRIMARY KEY ("userWalletAddress","agentId")
);

-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL,
    "status" "UsageEventStatus" NOT NULL DEFAULT 'PENDING',
    "feeDeducted" DECIMAL(65,30),
    "creditsDeducted" BIGINT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agentId" TEXT NOT NULL,
    "userWalletAddress" TEXT NOT NULL,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopUpTransaction" (
    "txHash" TEXT NOT NULL,
    "status" "TopUpStatus" NOT NULL DEFAULT 'PENDING',
    "userWalletAddress" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "amountInEth" TEXT NOT NULL,
    "creditsToTopUp" BIGINT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopUpTransaction_pkey" PRIMARY KEY ("txHash")
);

-- CreateIndex
CREATE UNIQUE INDEX "Developer_privyId_key" ON "Developer"("privyId");

-- CreateIndex
CREATE UNIQUE INDEX "Developer_walletAddress_key" ON "Developer"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "UsageEvent_agentId_idempotencyKey_key" ON "UsageEvent"("agentId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBalance" ADD CONSTRAINT "UserBalance_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
