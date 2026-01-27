/**
 * Statistics tRPC Router
 * Dashboard 统计与趋势 API
 * 
 * 使用 Prisma + PostgreSQL 实现
 */

import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import prisma from '@/lib/prisma'

// 通用输入验证
const timeRangeInputSchema = z.object({
  projectId: z.string().min(1),
  timeRange: z.enum(['1d', '7d', '30d', '90d']).default('7d'),
})

/**
 * 将 timeRange 转换为日期对象
 */
function getTimeRangeDate(timeRange: string): Date {
  const days = {
    '1d': 1,
    '7d': 7,
    '30d': 30,
    '90d': 90,
  }[timeRange] || 7
  
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

export const statisticsRouter = router({
  /**
   * 总量统计 (Task 5.1)
   */
  overview: publicProcedure
    .input(timeRangeInputSchema)
    .query(async ({ input }) => {
      const startDate = getTimeRangeDate(input.timeRange)
      
      // 查询 Traces 统计
      const tracesStats = await prisma.trace.aggregate({
        where: {
          projectId: input.projectId,
          timestamp: { gte: startDate },
        },
        _count: true,
        _sum: { totalTokens: true },
        _avg: { latencyMs: true },
      })
      
      // 查询评测次数
      const scoresCount = await prisma.score.count({
        where: {
          projectId: input.projectId,
          timestamp: { gte: startDate },
        },
      })
      
      return {
        totalTraces: tracesStats._count,
        totalEvaluations: scoresCount,
        totalTokens: tracesStats._sum.totalTokens || 0,
        avgLatencyMs: tracesStats._avg.latencyMs || 0,
      }
    }),

  /**
   * 平均分统计 (Task 5.1)
   */
  scoreStats: publicProcedure
    .input(timeRangeInputSchema)
    .query(async ({ input }) => {
      const startDate = getTimeRangeDate(input.timeRange)
      
      const stats = await prisma.score.aggregate({
        where: {
          projectId: input.projectId,
          timestamp: { gte: startDate },
        },
        _avg: { score: true },
        _min: { score: true },
        _max: { score: true },
      })
      
      return {
        avgScore: stats._avg.score || 0,
        minScore: stats._min.score || 0,
        maxScore: stats._max.score || 0,
      }
    }),

  /**
   * 延迟分位数统计 (Task 5.1)
   * 注意：PostgreSQL 没有原生分位数函数，使用近似计算
   */
  latencyPercentiles: publicProcedure
    .input(timeRangeInputSchema)
    .query(async ({ input }) => {
      const startDate = getTimeRangeDate(input.timeRange)
      
      // 查询所有延迟数据并排序
      const traces = await prisma.trace.findMany({
        where: {
          projectId: input.projectId,
          timestamp: { gte: startDate },
          latencyMs: { not: null },
        },
        select: { latencyMs: true },
        orderBy: { latencyMs: 'asc' },
      })
      
      if (traces.length === 0) {
        return { p50: 0, p90: 0, p99: 0 }
      }
      
      const latencies = traces.map(t => t.latencyMs!).filter(l => l !== null)
      const getPercentile = (arr: number[], p: number) => {
        const index = Math.floor(arr.length * p)
        return arr[Math.min(index, arr.length - 1)]
      }
      
      return {
        p50: getPercentile(latencies, 0.5),
        p90: getPercentile(latencies, 0.9),
        p99: getPercentile(latencies, 0.99),
      }
    }),

  /**
   * 评分趋势数据 (Task 5.2)
   */
  scoreTrend: publicProcedure
    .input(timeRangeInputSchema)
    .query(async ({ input }) => {
      const startDate = getTimeRangeDate(input.timeRange)
      
      // 使用 Prisma raw query 进行日期分组
      const scores = await prisma.score.findMany({
        where: {
          projectId: input.projectId,
          timestamp: { gte: startDate },
        },
        select: { timestamp: true, score: true },
        orderBy: { timestamp: 'asc' },
      })
      
      // 按日期分组计算平均分
      const dateMap = new Map<string, { sum: number; count: number }>()
      for (const s of scores) {
        const dateKey = s.timestamp.toISOString().split('T')[0]
        const current = dateMap.get(dateKey) || { sum: 0, count: 0 }
        dateMap.set(dateKey, { sum: current.sum + s.score, count: current.count + 1 })
      }
      
      return {
        data: Array.from(dateMap.entries()).map(([date, { sum, count }]) => ({
          date,
          avgScore: sum / count,
        })),
      }
    }),

  /**
   * 各维度平均分数据 (Task 5.2)
   */
  dimensionScores: publicProcedure
    .input(timeRangeInputSchema)
    .query(async ({ input }) => {
      const startDate = getTimeRangeDate(input.timeRange)
      
      const scores = await prisma.score.groupBy({
        by: ['evaluatorName'],
        where: {
          projectId: input.projectId,
          timestamp: { gte: startDate },
        },
        _avg: { score: true },
        orderBy: { _avg: { score: 'desc' } },
      })
      
      return {
        dimensions: scores.map(row => ({
          name: row.evaluatorName,
          avgScore: row._avg.score || 0,
        })),
      }
    }),

  /**
   * 延迟分布数据 (Task 5.2)
   */
  latencyDistribution: publicProcedure
    .input(timeRangeInputSchema)
    .query(async ({ input }) => {
      const startDate = getTimeRangeDate(input.timeRange)
      
      const traces = await prisma.trace.findMany({
        where: {
          projectId: input.projectId,
          timestamp: { gte: startDate },
        },
        select: { latencyMs: true },
      })
      
      // 手动分桶
      const buckets = {
        '0-100': 0,
        '100-500': 0,
        '500-1000': 0,
        '1000+': 0,
      }
      
      for (const t of traces) {
        const latency = t.latencyMs || 0
        if (latency < 100) buckets['0-100']++
        else if (latency < 500) buckets['100-500']++
        else if (latency < 1000) buckets['500-1000']++
        else buckets['1000+']++
      }
      
      return {
        buckets: Object.entries(buckets).map(([range, count]) => ({ range, count })),
      }
    }),

  /**
   * 合并仪表盘数据 (Task 9.2 - 性能优化)
   */
  dashboardOverview: publicProcedure
    .input(timeRangeInputSchema)
    .query(async ({ input }) => {
      const startDate = getTimeRangeDate(input.timeRange)
      
      // 并行执行所有查询
      const [tracesStats, scoresStats, allTraces, allScores] = await Promise.all([
        // Traces 统计
        prisma.trace.aggregate({
          where: {
            projectId: input.projectId,
            timestamp: { gte: startDate },
          },
          _count: true,
          _sum: { totalTokens: true },
          _avg: { latencyMs: true },
        }),
        // Scores 统计
        prisma.score.aggregate({
          where: {
            projectId: input.projectId,
            timestamp: { gte: startDate },
          },
          _count: true,
          _avg: { score: true },
          _min: { score: true },
          _max: { score: true },
        }),
        // 延迟数据（用于计算分位数和分布）
        prisma.trace.findMany({
          where: {
            projectId: input.projectId,
            timestamp: { gte: startDate },
          },
          select: { latencyMs: true },
          orderBy: { latencyMs: 'asc' },
        }),
        // 评分数据（用于趋势和维度）
        prisma.score.findMany({
          where: {
            projectId: input.projectId,
            timestamp: { gte: startDate },
          },
          select: { timestamp: true, score: true, evaluatorName: true },
        }),
      ])
      
      // 计算延迟分位数
      const latencies = allTraces.map(t => t.latencyMs).filter((l): l is number => l !== null)
      latencies.sort((a, b) => a - b)
      const getPercentile = (arr: number[], p: number) => {
        if (arr.length === 0) return 0
        const index = Math.floor(arr.length * p)
        return arr[Math.min(index, arr.length - 1)]
      }
      
      // 计算延迟分布
      const buckets = { '0-100': 0, '100-500': 0, '500-1000': 0, '1000+': 0 }
      for (const latency of latencies) {
        if (latency < 100) buckets['0-100']++
        else if (latency < 500) buckets['100-500']++
        else if (latency < 1000) buckets['500-1000']++
        else buckets['1000+']++
      }
      
      // 计算评分趋势
      const dateMap = new Map<string, { sum: number; count: number }>()
      for (const s of allScores) {
        const dateKey = s.timestamp.toISOString().split('T')[0]
        const current = dateMap.get(dateKey) || { sum: 0, count: 0 }
        dateMap.set(dateKey, { sum: current.sum + s.score, count: current.count + 1 })
      }
      
      // 计算维度评分
      const dimensionMap = new Map<string, { sum: number; count: number }>()
      for (const s of allScores) {
        const current = dimensionMap.get(s.evaluatorName) || { sum: 0, count: 0 }
        dimensionMap.set(s.evaluatorName, { sum: current.sum + s.score, count: current.count + 1 })
      }
      
      const totalTraces = tracesStats._count
      const totalEvaluations = scoresStats._count
      
      return {
        overview: {
          totalTraces,
          totalEvaluations,
          totalTokens: tracesStats._sum.totalTokens || 0,
          avgLatencyMs: tracesStats._avg.latencyMs || 0,
        },
        scoreStats: totalEvaluations > 0 ? {
          avgScore: scoresStats._avg.score || 0,
          minScore: scoresStats._min.score || 0,
          maxScore: scoresStats._max.score || 0,
        } : null,
        latencyPercentiles: {
          p50: getPercentile(latencies, 0.5),
          p90: getPercentile(latencies, 0.9),
          p99: getPercentile(latencies, 0.99),
        },
        scoreTrend: totalEvaluations > 0 ? Array.from(dateMap.entries()).map(([date, { sum, count }]) => ({
          date,
          avgScore: sum / count,
        })) : null,
        dimensionScores: totalEvaluations > 0 ? Array.from(dimensionMap.entries())
          .map(([name, { sum, count }]) => ({ name, avgScore: sum / count }))
          .sort((a, b) => b.avgScore - a.avgScore) : null,
        latencyDistribution: Object.entries(buckets).map(([range, count]) => ({ range, count })),
      }
    }),
})

export type StatisticsRouter = typeof statisticsRouter
