-- AlterTable
ALTER TABLE "Score" ADD COLUMN     "authorUserId" TEXT,
ADD COLUMN     "dataType" TEXT NOT NULL DEFAULT 'NUMERIC',
ADD COLUMN     "observationId" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'EVAL',
ADD COLUMN     "stringValue" TEXT;

-- CreateIndex
CREATE INDEX "Score_observationId_idx" ON "Score"("observationId");
