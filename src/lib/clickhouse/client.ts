/**
 * 数据访问层 - PostgreSQL 实现
 * 替代原 ClickHouse 实现，使用 Prisma ORM
 */

import prisma from '@/lib/prisma'

/**
 * Trace 数据类型
 */
export interface TraceData {
  id: string
  projectId: string
  difyConnectionId?: string
  workflowName?: string
  name?: string
  timestamp: string
  userId?: string
  sessionId?: string
  input?: string
  output?: string
  metadata?: Record<string, string>
  tags?: string[]
  totalTokens?: number
  latencyMs?: number
  status?: string
}

/**
 * 评测分数数据类型
 */
export interface ScoreData {
  id: string
  project_id: string
  trace_id: string
  evaluator_id: string
  evaluator_name: string
  score: number
  reason: string
  eval_job_id?: string
  created_at: string
}

/**
 * 插入 Trace 数据到 PostgreSQL
 */
export async function insertTrace(trace: TraceData): Promise<void> {
  await prisma.trace.create({
    data: {
      id: trace.id,
      projectId: trace.projectId,
      difyConnectionId: trace.difyConnectionId || null,
      workflowName: trace.workflowName || null,
      name: trace.name || null,
      timestamp: new Date(trace.timestamp),
      userId: trace.userId || null,
      sessionId: trace.sessionId || null,
      input: trace.input || null,
      output: trace.output || null,
      metadata: trace.metadata ?? undefined,
      tags: trace.tags || [],
      totalTokens: trace.totalTokens || null,
      latencyMs: trace.latencyMs || null,
      status: trace.status || 'success',
    },
  })
}

/**
 * 批量插入 Traces
 */
export async function insertTraces(traces: TraceData[]): Promise<void> {
  if (traces.length === 0) return

  await prisma.trace.createMany({
    data: traces.map(trace => ({
      id: trace.id,
      projectId: trace.projectId,
      difyConnectionId: trace.difyConnectionId || null,
      workflowName: trace.workflowName || null,
      name: trace.name || null,
      timestamp: new Date(trace.timestamp),
      userId: trace.userId || null,
      sessionId: trace.sessionId || null,
      input: trace.input || null,
      output: trace.output || null,
      metadata: trace.metadata ?? undefined,
      tags: trace.tags || [],
      totalTokens: trace.totalTokens || null,
      latencyMs: trace.latencyMs || null,
      status: trace.status || 'success',
    })),
    skipDuplicates: true,
  })
}

/**
 * 插入单条评测分数
 */
export async function insertScore(score: ScoreData): Promise<void> {
  await prisma.score.create({
    data: {
      id: score.id,
      traceId: score.trace_id,
      projectId: score.project_id,
      evaluatorId: score.evaluator_id,
      evaluatorName: score.evaluator_name,
      score: score.score,
      reasoning: score.reason,
      evalJobId: score.eval_job_id || null,
      timestamp: new Date(score.created_at),
    },
  })
}

/**
 * 批量插入评测分数
 */
export async function insertScores(scores: ScoreData[]): Promise<void> {
  if (scores.length === 0) return

  await prisma.score.createMany({
    data: scores.map(score => ({
      id: score.id,
      traceId: score.trace_id,
      projectId: score.project_id,
      evaluatorId: score.evaluator_id,
      evaluatorName: score.evaluator_name,
      score: score.score,
      reasoning: score.reason,
      evalJobId: score.eval_job_id || null,
      timestamp: new Date(score.created_at),
    })),
    skipDuplicates: true,
  })
}

/**
 * 保持向后兼容：导出一个空的 getClickHouseClient 函数
 * 避免需要修改其他导入该函数的代码
 */
export function getClickHouseClient(): null {
  console.warn('ClickHouse client is deprecated. Using PostgreSQL via Prisma.')
  return null
}
