-- CreateTable
CREATE TABLE "DatasetRun" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatasetRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatasetRunItem" (
    "id" TEXT NOT NULL,
    "datasetRunId" TEXT NOT NULL,
    "datasetItemId" TEXT NOT NULL,
    "traceId" TEXT,
    "observationId" TEXT,
    "input" JSONB,
    "expectedOutput" JSONB,
    "output" JSONB,
    "error" TEXT,
    "latencyMs" INTEGER,
    "totalTokens" INTEGER,
    "totalCost" DECIMAL(10,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatasetRunItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DatasetRun_datasetId_idx" ON "DatasetRun"("datasetId");

-- CreateIndex
CREATE INDEX "DatasetRun_projectId_createdAt_idx" ON "DatasetRun"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "DatasetRunItem_datasetRunId_idx" ON "DatasetRunItem"("datasetRunId");

-- CreateIndex
CREATE INDEX "DatasetRunItem_datasetItemId_idx" ON "DatasetRunItem"("datasetItemId");

-- AddForeignKey
ALTER TABLE "DatasetRun" ADD CONSTRAINT "DatasetRun_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetRun" ADD CONSTRAINT "DatasetRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetRunItem" ADD CONSTRAINT "DatasetRunItem_datasetRunId_fkey" FOREIGN KEY ("datasetRunId") REFERENCES "DatasetRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetRunItem" ADD CONSTRAINT "DatasetRunItem_datasetItemId_fkey" FOREIGN KEY ("datasetItemId") REFERENCES "DatasetItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
