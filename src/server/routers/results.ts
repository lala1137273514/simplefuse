/**
 * Results tRPC Router
 * 评测结果查询 API
 * 
 * Task 6.4: 评测结果页面
 */

import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { getClickHouseClient } from '@/lib/clickhouse'

// 通用输入验证
const baseInputSchema = z.object({
  projectId: z.string().min(1),
  limit: z.number().min(1).max(100).optional().default(50),
  offset: z.number().min(0).optional().default(0),
})

// 列表筛选输入
const listInputSchema = baseInputSchema.extend({
  evaluatorName: z.string().optional(),
  traceId: z.string().optional(),
  minScore: z.number().optional(),
  maxScore: z.number().optional(),
  timeRange: z.enum(['1d', '7d', '30d', '90d']).optional().default('7d'),
})

// 时间范围条件
function getTimeRangeCondition(timeRange: string): string {
  const days = {
    '1d': 1,
    '7d': 7,
    '30d': 30,
    '90d': 90,
  }[timeRange] || 7
  
  return `created_at >= now() - INTERVAL ${days} DAY`
}

export const resultsRouter = router({
  /**
   * 获取评测结果列表
   */
  list: publicProcedure
    .input(listInputSchema)
    .query(async ({ input }) => {
      const client = getClickHouseClient()
      const timeCondition = getTimeRangeCondition(input.timeRange)
      
      // 构建筛选条件
      const conditions = [
        `project_id = {projectId:String}`,
        timeCondition,
        `is_deleted = 0`,
      ]
      
      if (input.evaluatorName) {
        conditions.push(`evaluator_name = {evaluatorName:String}`)
      }
      if (input.traceId) {
        conditions.push(`trace_id = {traceId:String}`)
      }
      if (input.minScore !== undefined) {
        conditions.push(`score >= {minScore:Float64}`)
      }
      if (input.maxScore !== undefined) {
        conditions.push(`score <= {maxScore:Float64}`)
      }

      const result = await client.query({
        query: `
          SELECT 
            id,
            trace_id,
            evaluator_name,
            score,
            reasoning,
            created_at
          FROM scores 
          WHERE ${conditions.join(' AND ')}
          ORDER BY created_at DESC
          LIMIT {limit:UInt32} OFFSET {offset:UInt32}
        `,
        query_params: {
          projectId: input.projectId,
          evaluatorName: input.evaluatorName || '',
          traceId: input.traceId || '',
          minScore: input.minScore || 0,
          maxScore: input.maxScore || 10,
          limit: input.limit,
          offset: input.offset,
        },
        format: 'JSONEachRow',
      })

      const rows = await result.json() as Array<{
        id: string
        trace_id: string
        evaluator_name: string
        score: string
        reasoning: string
        created_at: string
      }>

      return {
        results: rows.map(row => ({
          id: row.id,
          traceId: row.trace_id,
          evaluatorName: row.evaluator_name,
          score: parseFloat(row.score),
          reasoning: row.reasoning,
          createdAt: row.created_at,
        })),
      }
    }),

  /**
   * 获取指定 Trace 的所有评测结果
   */
  getByTraceId: publicProcedure
    .input(z.object({
      projectId: z.string().min(1),
      traceId: z.string().min(1),
    }))
    .query(async ({ input }) => {
      const client = getClickHouseClient()

      const result = await client.query({
        query: `
          SELECT 
            id,
            trace_id,
            evaluator_name,
            score,
            reasoning,
            created_at
          FROM scores 
          WHERE project_id = {projectId:String}
            AND trace_id = {traceId:String}
            AND is_deleted = 0
          ORDER BY evaluator_name ASC
        `,
        query_params: {
          projectId: input.projectId,
          traceId: input.traceId,
        },
        format: 'JSONEachRow',
      })

      const rows = await result.json() as Array<{
        id: string
        trace_id: string
        evaluator_name: string
        score: string
        reasoning: string
        created_at: string
      }>

      const scores = rows.map(row => parseFloat(row.score))
      const avgScore = scores.length > 0 
        ? scores.reduce((a, b) => a + b, 0) / scores.length 
        : 0

      return {
        results: rows.map(row => ({
          id: row.id,
          traceId: row.trace_id,
          evaluatorName: row.evaluator_name,
          score: parseFloat(row.score),
          reasoning: row.reasoning,
          createdAt: row.created_at,
        })),
        avgScore,
      }
    }),

  /**
   * 获取评测结果汇总
   */
  summary: publicProcedure
    .input(z.object({
      projectId: z.string().min(1),
      timeRange: z.enum(['1d', '7d', '30d', '90d']).default('7d'),
    }))
    .query(async ({ input }) => {
      const client = getClickHouseClient()
      const timeCondition = getTimeRangeCondition(input.timeRange)

      const result = await client.query({
        query: `
          SELECT 
            evaluator_name,
            avg(score) as avg_score,
            count() as count
          FROM scores 
          WHERE project_id = {projectId:String}
            AND ${timeCondition}
            AND is_deleted = 0
          GROUP BY evaluator_name
          ORDER BY evaluator_name ASC
        `,
        query_params: {
          projectId: input.projectId,
        },
        format: 'JSONEachRow',
      })

      const rows = await result.json() as Array<{
        evaluator_name: string
        avg_score: string
        count: string
      }>

      const totalCount = rows.reduce((sum, row) => sum + parseInt(row.count, 10), 0)

      return {
        dimensions: rows.map(row => ({
          name: row.evaluator_name,
          avgScore: parseFloat(row.avg_score),
          count: parseInt(row.count, 10),
        })),
        totalCount,
      }
    }),

  /**
   * 按任务 ID 查询评测结果（按 Trace 分组）
   */
  listByJobId: publicProcedure
    .input(z.object({
      projectId: z.string().min(1),
      jobId: z.string().min(1),
    }))
    .query(async ({ input }) => {
      const client = getClickHouseClient()

      const result = await client.query({
        query: `
          SELECT 
            id,
            trace_id,
            evaluator_id,
            evaluator_name,
            score,
            reasoning,
            created_at
          FROM scores 
          WHERE project_id = {projectId:String}
            AND eval_job_id = {jobId:String}
            AND is_deleted = 0
          ORDER BY trace_id, evaluator_name ASC
        `,
        query_params: {
          projectId: input.projectId,
          jobId: input.jobId,
        },
        format: 'JSONEachRow',
      })

      const rows = await result.json() as Array<{
        id: string
        trace_id: string
        evaluator_id: string
        evaluator_name: string
        score: string
        reasoning: string
        created_at: string
      }>

      // 按 trace_id 分组
      const traceMap = new Map<string, {
        traceId: string
        scores: Array<{
          id: string
          evaluatorId: string
          evaluatorName: string
          score: number
          reasoning: string
          createdAt: string
        }>
      }>()

      for (const row of rows) {
        if (!traceMap.has(row.trace_id)) {
          traceMap.set(row.trace_id, {
            traceId: row.trace_id,
            scores: [],
          })
        }
        traceMap.get(row.trace_id)!.scores.push({
          id: row.id,
          evaluatorId: row.evaluator_id,
          evaluatorName: row.evaluator_name,
          score: parseFloat(row.score),
          reasoning: row.reasoning,
          createdAt: row.created_at,
        })
      }

      return {
        traces: Array.from(traceMap.values()),
      }
    }),

  /**
   * 获取任务的汇总统计
   */
  getJobSummary: publicProcedure
    .input(z.object({
      projectId: z.string().min(1),
      jobId: z.string().min(1),
    }))
    .query(async ({ input }) => {
      const client = getClickHouseClient()

      const result = await client.query({
        query: `
          SELECT 
            evaluator_name,
            avg(score) as avg_score,
            count() as count,
            countDistinct(trace_id) as trace_count
          FROM scores 
          WHERE project_id = {projectId:String}
            AND eval_job_id = {jobId:String}
            AND is_deleted = 0
          GROUP BY evaluator_name
          ORDER BY evaluator_name ASC
        `,
        query_params: {
          projectId: input.projectId,
          jobId: input.jobId,
        },
        format: 'JSONEachRow',
      })

      const rows = await result.json() as Array<{
        evaluator_name: string
        avg_score: string
        count: string
        trace_count: string
      }>

      const totalTraces = rows.length > 0 ? parseInt(rows[0].trace_count, 10) : 0

      return {
        evaluators: rows.map(row => ({
          name: row.evaluator_name,
          avgScore: parseFloat(row.avg_score),
          count: parseInt(row.count, 10),
        })),
        totalTraces,
      }
    }),
})

export type ResultsRouter = typeof resultsRouter
