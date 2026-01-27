-- Migration: Add Trace and Score tables (migrated from ClickHouse)

-- CreateTable
CREATE TABLE "Trace" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "difyConnectionId" TEXT,
    "workflowName" TEXT,
    "name" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "input" TEXT,
    "output" TEXT,
    "metadata" JSONB,
    "tags" TEXT[],
    "totalTokens" INTEGER,
    "latencyMs" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'success',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL,
    "traceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "evaluatorName" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reasoning" TEXT,
    "evalJobId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Trace_projectId_timestamp_idx" ON "Trace"("projectId", "timestamp");

-- CreateIndex
CREATE INDEX "Trace_difyConnectionId_idx" ON "Trace"("difyConnectionId");

-- CreateIndex
CREATE INDEX "Trace_workflowName_idx" ON "Trace"("workflowName");

-- CreateIndex
CREATE INDEX "Score_projectId_evaluatorName_timestamp_idx" ON "Score"("projectId", "evaluatorName", "timestamp");

-- CreateIndex
CREATE INDEX "Score_traceId_idx" ON "Score"("traceId");

-- CreateIndex
CREATE INDEX "Score_evalJobId_idx" ON "Score"("evalJobId");

-- AddForeignKey
ALTER TABLE "Trace" ADD CONSTRAINT "Trace_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_traceId_fkey" FOREIGN KEY ("traceId") REFERENCES "Trace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
