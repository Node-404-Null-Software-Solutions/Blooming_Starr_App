-- CreateTable
CREATE TABLE "PendingMemberInvite" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "email" TEXT,
    "role" "RequestedRole" NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingMemberInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingMemberInvite_token_key" ON "PendingMemberInvite"("token");

-- CreateIndex
CREATE INDEX "PendingMemberInvite_businessId_idx" ON "PendingMemberInvite"("businessId");

-- CreateIndex
CREATE INDEX "PendingMemberInvite_token_idx" ON "PendingMemberInvite"("token");

-- AddForeignKey
ALTER TABLE "PendingMemberInvite" ADD CONSTRAINT "PendingMemberInvite_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
