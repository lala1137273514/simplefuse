/**
 * Results tRPC Router
 * 评测结果查询 API
 * 
 * 使用 Prisma + PostgreSQL 实现
 */

import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'

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

export const resultsRouter = router({
  /**
   * 获取评测结果列表
   */
  list: publicProcedure
    .input(listInputSchema)
    .query(async ({ input }) => {
      const startDate = getTimeRangeDate(input.timeRange)
      
      // 构建筛选条件
      const where: Prisma.ScoreWhereInput = {
        projectId: input.projectId,
        createdAt: { gte: startDate },
      }
      
      if (input.evaluatorName) {
        where.evaluatorName = input.evaluatorName
      }
      if (input.traceId) {
        where.traceId = input.traceId
      }
      if (input.minScore !== undefined) {
        where.score = { ...((where.score as Prisma.FloatFilter) || {}), gte: input.minScore }
      }
      if (input.maxScore !== undefined) {
        where.score = { ...((where.score as Prisma.FloatFilter) || {}), lte: input.maxScore }
      }

      const scores = await prisma.score.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: input.limit,
        skip: input.offset,
      })

      return {
        results: scores.map(row => ({
          id: row.id,
          traceId: row.traceId,
          evaluatorName: row.evaluatorName,
          score: row.score,
          reasoning: row.reasoning || '',
          createdAt: row.createdAt.toISOString(),
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
      const scores = await prisma.score.findMany({
        where: {
          projectId: input.projectId,
          traceId: input.traceId,
        },
        orderBy: { evaluatorName: 'asc' },
      })

      const scoreValues = scores.map(row => row.score)
      const avgScore = scoreValues.length > 0 
        ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length 
        : 0

      return {
        results: scores.map(row => ({
          id: row.id,
          traceId: row.traceId,
          evaluatorName: row.evaluatorName,
          score: row.score,
          reasoning: row.reasoning || '',
          createdAt: row.createdAt.toISOString(),
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
      const startDate = getTimeRangeDate(input.timeRange)

      const grouped = await prisma.score.groupBy({
        by: ['evaluatorName'],
        where: {
          projectId: input.projectId,
          createdAt: { gte: startDate },
        },
        _avg: { score: true },
        _count: true,
        orderBy: { evaluatorName: 'asc' },
      })

      const totalCount = grouped.reduce((sum, row) => sum + row._count, 0)

      return {
        dimensions: grouped.map(row => ({
          name: row.evaluatorName,
          avgScore: row._avg.score || 0,
          count: row._count,
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
      const scores = await prisma.score.findMany({
        where: {
          projectId: input.projectId,
          evalJobId: input.jobId,
        },
        orderBy: [{ traceId: 'asc' }, { evaluatorName: 'asc' }],
      })

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

      for (const row of scores) {
        if (!traceMap.has(row.traceId)) {
          traceMap.set(row.traceId, {
            traceId: row.traceId,
            scores: [],
          })
        }
        traceMap.get(row.traceId)!.scores.push({
          id: row.id,
          evaluatorId: row.evaluatorId,
          evaluatorName: row.evaluatorName,
          score: row.score,
          reasoning: row.reasoning || '',
          createdAt: row.createdAt.toISOString(),
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
      const grouped = await prisma.score.groupBy({
        by: ['evaluatorName'],
        where: {
          projectId: input.projectId,
          evalJobId: input.jobId,
        },
        _avg: { score: true },
        _count: true,
        orderBy: { evaluatorName: 'asc' },
      })

      // 获取不同 trace 数量
      const distinctTraces = await prisma.score.findMany({
        where: {
          projectId: input.projectId,
          evalJobId: input.jobId,
        },
        distinct: ['traceId'],
        select: { traceId: true },
      })

      return {
        evaluators: grouped.map(row => ({
          name: row.evaluatorName,
          avgScore: row._avg.score || 0,
          count: row._count,
        })),
        totalTraces: distinctTraces.length,
      }
    }),
})

export type ResultsRouter = typeof resultsRouter
