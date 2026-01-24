/**
 * Traces tRPC Router
 * 处理 Trace 查询相关的 API
 */

import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { queryTraces, queryTraceById, type TraceRecord } from '@/lib/clickhouse'

// 列表查询输入验证
const listInputSchema = z.object({
  projectId: z.string().min(1),
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
  status: z.string().optional(),
  name: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  orderBy: z.enum(['timestamp', 'latency_ms', 'total_tokens']).optional(),
  orderDir: z.enum(['asc', 'desc']).optional(),
})

// 详情查询输入验证
const getByIdInputSchema = z.object({
  id: z.string().min(1),
})

/**
 * 转换 ClickHouse 记录为前端格式
 */
function transformTrace(record: TraceRecord) {
  return {
    id: record.id,
    projectId: record.project_id,
    difyConnectionId: record.dify_connection_id,
    workflowName: record.workflow_name,
    name: record.name,
    timestamp: record.timestamp,
    userId: record.user_id,
    sessionId: record.session_id,
    input: record.input,
    output: record.output,
    metadata: record.metadata,
    tags: record.tags,
    totalTokens: record.total_tokens,
    latencyMs: record.latency_ms,
    status: record.status,
    createdAt: record.created_at,
  }
}

export const tracesRouter = router({
  /**
   * 获取 Trace 列表
   */
  list: publicProcedure
    .input(listInputSchema)
    .query(async ({ input }) => {
      const { traces, total } = await queryTraces({
        projectId: input.projectId,
        limit: input.limit,
        offset: input.offset,
        status: input.status,
        name: input.name,
        startTime: input.startTime,
        endTime: input.endTime,
        orderBy: input.orderBy,
        orderDir: input.orderDir,
      })

      return {
        traces: traces.map(transformTrace),
        total,
        limit: input.limit,
        offset: input.offset,
      }
    }),

  /**
   * 根据 ID 获取 Trace 详情
   */
  getById: publicProcedure
    .input(getByIdInputSchema)
    .query(async ({ input }) => {
      const trace = await queryTraceById(input.id)

      if (!trace) {
        throw new Error('Trace 不存在')
      }

      return transformTrace(trace)
    }),
})

export type TracesRouter = typeof tracesRouter
