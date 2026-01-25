/**
 * Statistics tRPC Router
 * Dashboard 统计与趋势 API
 * 
 * Task 5.1: 总量/平均分/Token/延迟统计
 * Task 5.2: 评分趋势/维度平均/延迟分布
 */

import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { getClickHouseClient } from '@/lib/clickhouse'

// 通用输入验证
const timeRangeInputSchema = z.object({
  projectId: z.string().min(1),
  timeRange: z.enum(['1d', '7d', '30d', '90d']).default('7d'),
})

/**
 * 将 timeRange 转换为 SQL 日期条件
 */
function getTimeRangeCondition(timeRange: string): string {
  const days = {
    '1d': 1,
    '7d': 7,
    '30d': 30,
    '90d': 90,
  }[timeRange] || 7
  
  return `timestamp >= now() - INTERVAL ${days} DAY`
}

export const statisticsRouter = router({
  /**
   * 总量统计 (Task 5.1)
   */
  overview: publicProcedure
    .input(timeRangeInputSchema)
    .query(async ({ input }) => {
      const client = getClickHouseClient()
      const timeCondition = getTimeRangeCondition(input.timeRange)
      
      const result = await client.query({
        query: `
          SELECT 
            count() as total_traces,
            sum(coalesce(total_tokens, 0)) as total_tokens,
            avg(coalesce(latency_ms, 0)) as avg_latency_ms
          FROM traces 
          WHERE project_id = {projectId:String} 
            AND ${timeCondition}
            AND is_deleted = 0
        `,
        query_params: { projectId: input.projectId },
        format: 'JSONEachRow',
      })
      
      const rows = await result.json() as Array<{
        total_traces: string
        total_tokens: string
        avg_latency_ms: string
      }>
      const data = rows[0] || { total_traces: '0', total_tokens: '0', avg_latency_ms: '0' }
      
      // 获取评测次数
      const scoresResult = await client.query({
        query: `
          SELECT count() as total_evaluations
          FROM scores 
          WHERE project_id = {projectId:String} 
            AND ${timeCondition}
            AND is_deleted = 0
        `,
        query_params: { projectId: input.projectId },
        format: 'JSONEachRow',
      })
      
      const scoresData = (await scoresResult.json() as Array<{ total_evaluations: string }>)[0] || { total_evaluations: '0' }
      
      return {
        totalTraces: parseInt(data.total_traces, 10),
        totalEvaluations: parseInt(scoresData.total_evaluations, 10),
        totalTokens: parseInt(data.total_tokens, 10),
        avgLatencyMs: parseFloat(data.avg_latency_ms) || 0,
      }
    }),

  /**
   * 平均分统计 (Task 5.1)
   */
  scoreStats: publicProcedure
    .input(timeRangeInputSchema)
    .query(async ({ input }) => {
      const client = getClickHouseClient()
      const timeCondition = getTimeRangeCondition(input.timeRange)
      
      const result = await client.query({
        query: `
          SELECT 
            avg(score) as avg_score,
            min(score) as min_score,
            max(score) as max_score
          FROM scores 
          WHERE project_id = {projectId:String} 
            AND ${timeCondition}
            AND is_deleted = 0
        `,
        query_params: { projectId: input.projectId },
        format: 'JSONEachRow',
      })
      
      const rows = await result.json() as Array<{
        avg_score: string
        min_score: string
        max_score: string
      }>
      const data = rows[0] || { avg_score: '0', min_score: '0', max_score: '0' }
      
      return {
        avgScore: parseFloat(data.avg_score) || 0,
        minScore: parseFloat(data.min_score) || 0,
        maxScore: parseFloat(data.max_score) || 0,
      }
    }),

  /**
   * 延迟分位数统计 (Task 5.1)
   */
  latencyPercentiles: publicProcedure
    .input(timeRangeInputSchema)
    .query(async ({ input }) => {
      const client = getClickHouseClient()
      const timeCondition = getTimeRangeCondition(input.timeRange)
      
      const result = await client.query({
        query: `
          SELECT 
            quantile(0.5)(coalesce(latency_ms, 0)) as p50,
            quantile(0.9)(coalesce(latency_ms, 0)) as p90,
            quantile(0.99)(coalesce(latency_ms, 0)) as p99
          FROM traces 
          WHERE project_id = {projectId:String} 
            AND ${timeCondition}
            AND is_deleted = 0
        `,
        query_params: { projectId: input.projectId },
        format: 'JSONEachRow',
      })
      
      const rows = await result.json() as Array<{
        p50: string
        p90: string
        p99: string
      }>
      const data = rows[0] || { p50: '0', p90: '0', p99: '0' }
      
      return {
        p50: parseInt(data.p50, 10),
        p90: parseInt(data.p90, 10),
        p99: parseInt(data.p99, 10),
      }
    }),

  /**
   * 评分趋势数据 (Task 5.2)
   */
  scoreTrend: publicProcedure
    .input(timeRangeInputSchema)
    .query(async ({ input }) => {
      const client = getClickHouseClient()
      const timeCondition = getTimeRangeCondition(input.timeRange)
      
      const result = await client.query({
        query: `
          SELECT 
            toDate(timestamp) as date,
            avg(score) as avg_score
          FROM scores 
          WHERE project_id = {projectId:String} 
            AND ${timeCondition}
            AND is_deleted = 0
          GROUP BY date
          ORDER BY date ASC
        `,
        query_params: { projectId: input.projectId },
        format: 'JSONEachRow',
      })
      
      const rows = await result.json() as Array<{
        date: string
        avg_score: string
      }>
      
      return {
        data: rows.map(row => ({
          date: row.date,
          avgScore: parseFloat(row.avg_score) || 0,
        })),
      }
    }),

  /**
   * 各维度平均分数据 (Task 5.2)
   */
  dimensionScores: publicProcedure
    .input(timeRangeInputSchema)
    .query(async ({ input }) => {
      const client = getClickHouseClient()
      const timeCondition = getTimeRangeCondition(input.timeRange)
      
      const result = await client.query({
        query: `
          SELECT 
            evaluator_name,
            avg(score) as avg_score
          FROM scores 
          WHERE project_id = {projectId:String} 
            AND ${timeCondition}
            AND is_deleted = 0
          GROUP BY evaluator_name
          ORDER BY avg_score DESC
        `,
        query_params: { projectId: input.projectId },
        format: 'JSONEachRow',
      })
      
      const rows = await result.json() as Array<{
        evaluator_name: string
        avg_score: string
      }>
      
      return {
        dimensions: rows.map(row => ({
          name: row.evaluator_name,
          avgScore: parseFloat(row.avg_score) || 0,
        })),
      }
    }),

  /**
   * 延迟分布数据 (Task 5.2)
   */
  latencyDistribution: publicProcedure
    .input(timeRangeInputSchema)
    .query(async ({ input }) => {
      const client = getClickHouseClient()
      const timeCondition = getTimeRangeCondition(input.timeRange)
      
      const result = await client.query({
        query: `
          SELECT 
            multiIf(
              coalesce(latency_ms, 0) < 100, '0-100',
              coalesce(latency_ms, 0) < 500, '100-500',
              coalesce(latency_ms, 0) < 1000, '500-1000',
              '1000+'
            ) as bucket,
            count() as count
          FROM traces 
          WHERE project_id = {projectId:String} 
            AND ${timeCondition}
            AND is_deleted = 0
          GROUP BY bucket
          ORDER BY bucket ASC
        `,
        query_params: { projectId: input.projectId },
        format: 'JSONEachRow',
      })
      
      const rows = await result.json() as Array<{
        bucket: string
        count: string
      }>
      
      return {
        buckets: rows.map(row => ({
          range: row.bucket,
          count: parseInt(row.count, 10),
        })),
      }
    }),

  /**
   * 合并仪表盘数据 (Task 9.2 - 性能优化)
   * 一次性获取所有 Dashboard 需要的数据，减少网络请求
   */
  dashboardOverview: publicProcedure
    .input(timeRangeInputSchema)
    .query(async ({ input }) => {
      const client = getClickHouseClient()
      const timeCondition = getTimeRangeCondition(input.timeRange)
      
      // 并行执行所有查询
      const [tracesResult, scoresResult, percentileResult, trendResult, dimensionResult, distributionResult] = await Promise.all([
        // 1. Traces 统计
        client.query({
          query: `
            SELECT 
              count() as total_traces,
              sum(coalesce(total_tokens, 0)) as total_tokens,
              avg(coalesce(latency_ms, 0)) as avg_latency_ms
            FROM traces 
            WHERE project_id = {projectId:String} 
              AND ${timeCondition}
              AND is_deleted = 0
          `,
          query_params: { projectId: input.projectId },
          format: 'JSONEachRow',
        }),
        
        // 2. 评分统计
        client.query({
          query: `
            SELECT 
              count() as total_evaluations,
              avg(score) as avg_score,
              min(score) as min_score,
              max(score) as max_score
            FROM scores 
            WHERE project_id = {projectId:String} 
              AND ${timeCondition}
              AND is_deleted = 0
          `,
          query_params: { projectId: input.projectId },
          format: 'JSONEachRow',
        }),
        
        // 3. 延迟分位数
        client.query({
          query: `
            SELECT 
              quantile(0.5)(coalesce(latency_ms, 0)) as p50,
              quantile(0.9)(coalesce(latency_ms, 0)) as p90,
              quantile(0.99)(coalesce(latency_ms, 0)) as p99
            FROM traces 
            WHERE project_id = {projectId:String} 
              AND ${timeCondition}
              AND is_deleted = 0
          `,
          query_params: { projectId: input.projectId },
          format: 'JSONEachRow',
        }),
        
        // 4. 评分趋势
        client.query({
          query: `
            SELECT 
              toDate(timestamp) as date,
              avg(score) as avg_score
            FROM scores 
            WHERE project_id = {projectId:String} 
              AND ${timeCondition}
              AND is_deleted = 0
            GROUP BY date
            ORDER BY date ASC
          `,
          query_params: { projectId: input.projectId },
          format: 'JSONEachRow',
        }),
        
        // 5. 维度评分
        client.query({
          query: `
            SELECT 
              evaluator_name,
              avg(score) as avg_score
            FROM scores 
            WHERE project_id = {projectId:String} 
              AND ${timeCondition}
              AND is_deleted = 0
            GROUP BY evaluator_name
            ORDER BY avg_score DESC
          `,
          query_params: { projectId: input.projectId },
          format: 'JSONEachRow',
        }),
        
        // 6. 延迟分布
        client.query({
          query: `
            SELECT 
              multiIf(
                coalesce(latency_ms, 0) < 100, '0-100',
                coalesce(latency_ms, 0) < 500, '100-500',
                coalesce(latency_ms, 0) < 1000, '500-1000',
                '1000+'
              ) as bucket,
              count() as count
            FROM traces 
            WHERE project_id = {projectId:String} 
              AND ${timeCondition}
              AND is_deleted = 0
            GROUP BY bucket
            ORDER BY bucket ASC
          `,
          query_params: { projectId: input.projectId },
          format: 'JSONEachRow',
        }),
      ])
      
      // 解析结果
      const tracesData = (await tracesResult.json() as Array<{
        total_traces: string
        total_tokens: string
        avg_latency_ms: string
      }>)[0] || { total_traces: '0', total_tokens: '0', avg_latency_ms: '0' }
      
      const scoresData = (await scoresResult.json() as Array<{
        total_evaluations: string
        avg_score: string
        min_score: string
        max_score: string
      }>)[0] || { total_evaluations: '0', avg_score: '0', min_score: '0', max_score: '0' }
      
      const percentileData = (await percentileResult.json() as Array<{
        p50: string
        p90: string
        p99: string
      }>)[0] || { p50: '0', p90: '0', p99: '0' }
      
      const trendRows = await trendResult.json() as Array<{ date: string; avg_score: string }>
      const dimensionRows = await dimensionResult.json() as Array<{ evaluator_name: string; avg_score: string }>
      const distributionRows = await distributionResult.json() as Array<{ bucket: string; count: string }>
      
      const totalTraces = parseInt(tracesData.total_traces, 10)
      const totalEvaluations = parseInt(scoresData.total_evaluations, 10)
      
      return {
        // 基础统计
        overview: {
          totalTraces,
          totalEvaluations,
          totalTokens: parseInt(tracesData.total_tokens, 10),
          avgLatencyMs: parseFloat(tracesData.avg_latency_ms) || 0,
        },
        // 评分统计 (当没有评测时隐藏)
        scoreStats: totalEvaluations > 0 ? {
          avgScore: parseFloat(scoresData.avg_score) || 0,
          minScore: parseFloat(scoresData.min_score) || 0,
          maxScore: parseFloat(scoresData.max_score) || 0,
        } : null,
        // 延迟分位数
        latencyPercentiles: {
          p50: parseInt(percentileData.p50, 10),
          p90: parseInt(percentileData.p90, 10),
          p99: parseInt(percentileData.p99, 10),
        },
        // 评分趋势 (当没有评测时隐藏)
        scoreTrend: totalEvaluations > 0 ? trendRows.map(row => ({
          date: row.date,
          avgScore: parseFloat(row.avg_score) || 0,
        })) : null,
        // 维度评分 (当没有评测时隐藏)
        dimensionScores: totalEvaluations > 0 ? dimensionRows.map(row => ({
          name: row.evaluator_name,
          avgScore: parseFloat(row.avg_score) || 0,
        })) : null,
        // 延迟分布
        latencyDistribution: distributionRows.map(row => ({
          range: row.bucket,
          count: parseInt(row.count, 10),
        })),
      }
    }),
})

export type StatisticsRouter = typeof statisticsRouter

