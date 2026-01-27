-- Migration: Add observations field to Trace table

-- AddColumn
ALTER TABLE "Trace" ADD COLUMN "observations" JSONB;
ALTER TABLE "Trace" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
