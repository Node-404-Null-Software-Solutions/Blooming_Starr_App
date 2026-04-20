-- Rename TransplantLog.dollarsPerCents to costCents (preserves data)
ALTER TABLE "TransplantLog" RENAME COLUMN "dollarsPerCents" TO "costCents";

-- Membership: change business FK to ON DELETE CASCADE
ALTER TABLE "Membership" DROP CONSTRAINT "Membership_businessId_fkey";
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- JoinRequest: change business FK to ON DELETE CASCADE
ALTER TABLE "JoinRequest" DROP CONSTRAINT "JoinRequest_businessId_fkey";
ALTER TABLE "JoinRequest" ADD CONSTRAINT "JoinRequest_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
