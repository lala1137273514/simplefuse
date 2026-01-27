/**
 * 查询功能 - PostgreSQL 实现
 * 替代原 ClickHouse 查询，使用 Prisma ORM
 */

import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export interface TraceListParams {
  projectId: string
  limit?: number
  offset?: number
  status?: string
  name?: string
  startTime?: string
  endTime?: string
  orderBy?: 'timestamp' | 'latency_ms' | 'total_tokens'
  orderDir?: 'asc' | 'desc'
  traceIds?: string[]
}

export interface TraceRecord {
  id: string
  project_id: string
  dify_connection_id: string
  workflow_name: string
  name: string
  timestamp: string
  user_id: string | null
  session_id: string | null
  input: string
  output: string
  metadata: Record<string, string>
  tags: string[]
  total_tokens: number | null
  latency_ms: number | null
  status: string
  observations: unknown[] | null
  created_at: string
}

/**
 * 将 Prisma Trace 记录转换为 TraceRecord 格式
 * 保持与原 ClickHouse 返回格式一致
 */
function toTraceRecord(trace: {
  id: string
  projectId: string
  difyConnectionId: string | null
  workflowName: string | null
  name: string | null
  timestamp: Date
  userId: string | null
  sessionId: string | null
  input: string | null
  output: string | null
  metadata: Prisma.JsonValue
  tags: string[]
  totalTokens: number | null
  latencyMs: number | null
  status: string
  observations?: Prisma.JsonValue | null
  createdAt: Date
}): TraceRecord {
  return {
    id: trace.id,
    project_id: trace.projectId,
    dify_connection_id: trace.difyConnectionId || '',
    workflow_name: trace.workflowName || '',
    name: trace.name || '',
    timestamp: trace.timestamp.toISOString(),
    user_id: trace.userId,
    session_id: trace.sessionId,
    input: trace.input || '',
    output: trace.output || '',
    metadata: (trace.metadata as Record<string, string>) || {},
    tags: trace.tags || [],
    total_tokens: trace.totalTokens,
    latency_ms: trace.latencyMs,
    status: trace.status,
    observations: (trace.observations as unknown[]) || null,
    created_at: trace.createdAt.toISOString(),
  }
}

/**
 * 查询 Trace 列表
 */
export async function queryTraces(params: TraceListParams): Promise<{
  traces: TraceRecord[]
  total: number
}> {
  const {
    projectId,
    limit = 20,
    offset = 0,
    status,
    name,
    startTime,
    endTime,
    orderBy = 'timestamp',
    orderDir = 'desc',
    traceIds,
  } = params

  // 构建 where 条件
  const where: Prisma.TraceWhereInput = {
    projectId,
  }

  if (status) {
    where.status = status
  }

  if (name) {
    where.name = {
      contains: name,
      mode: 'insensitive',
    }
  }

  if (traceIds && traceIds.length > 0) {
    where.id = {
      in: traceIds,
    }
  }

  if (startTime) {
    where.timestamp = {
      ...((where.timestamp as Prisma.DateTimeFilter) || {}),
      gte: new Date(startTime),
    }
  }

  if (endTime) {
    where.timestamp = {
      ...((where.timestamp as Prisma.DateTimeFilter) || {}),
      lte: new Date(endTime),
    }
  }

  // 映射排序字段
  const orderByField = {
    timestamp: 'timestamp',
    latency_ms: 'latencyMs',
    total_tokens: 'totalTokens',
  }[orderBy] as 'timestamp' | 'latencyMs' | 'totalTokens'

  // 查询数据
  const [traces, total] = await Promise.all([
    prisma.trace.findMany({
      where,
      orderBy: { [orderByField]: orderDir },
      take: limit,
      skip: offset,
    }),
    prisma.trace.count({ where }),
  ])

  return {
    traces: traces.map(toTraceRecord),
    total,
  }
}

/**
 * 根据 ID 查询单个 Trace
 */
export async function queryTraceById(id: string): Promise<TraceRecord | null> {
  const trace = await prisma.trace.findUnique({
    where: { id },
  })

  if (!trace) {
    return null
  }

  return toTraceRecord(trace)
}
