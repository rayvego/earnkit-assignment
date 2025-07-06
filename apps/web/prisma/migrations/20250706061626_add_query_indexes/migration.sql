-- CreateIndex
CREATE INDEX "Agent_developerId_idx" ON "Agent"("developerId");

-- CreateIndex
CREATE INDEX "TopUpTransaction_status_idx" ON "TopUpTransaction"("status");

-- CreateIndex
CREATE INDEX "UsageEvent_agentId_userWalletAddress_status_idx" ON "UsageEvent"("agentId", "userWalletAddress", "status");
