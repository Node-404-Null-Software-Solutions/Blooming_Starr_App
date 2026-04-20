-- CreateTable
CREATE TABLE "PendingCoOwnerInvite" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "newOwnerEmail" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingCoOwnerInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingCoOwnerInvite_token_key" ON "PendingCoOwnerInvite"("token");

-- CreateIndex
CREATE INDEX "PendingCoOwnerInvite_businessId_idx" ON "PendingCoOwnerInvite"("businessId");

-- CreateIndex
CREATE INDEX "PendingCoOwnerInvite_token_idx" ON "PendingCoOwnerInvite"("token");

-- AddForeignKey
ALTER TABLE "PendingCoOwnerInvite" ADD CONSTRAINT "PendingCoOwnerInvite_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
