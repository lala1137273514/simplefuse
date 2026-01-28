/**
 * EvalJobs tRPC Router
 * 评测任务管理 API
 */

import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import prisma from '@/lib/prisma'
import { TRPCError } from '@trpc/server'
import { executeEvaluationBatch, type EvalTaskData } from '@/lib/eval-executor'
import { getQueueStatus } from '@/lib/queue'
import { queryTraceById } from '@/lib/clickhouse'

// 创建评测任务输入
const createJobInputSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().optional(),
  sourceType: z.enum(['trace', 'traces', 'dataset']),
  // 单个 Trace 或多个 Trace ID
  traceIds: z.array(z.string()).optional(),
  // 或者使用 dataset
  datasetId: z.string().optional(),
  // 选择的评测器
  evaluatorIds: z.array(z.string()).min(1),
  // LLM 配置
  llmConfigId: z.string().min(1),
})

// 列表查询输入
const listJobsInputSchema = z.object({
  projectId: z.string().min(1),
  status: z.enum(['pending', 'running', 'completed', 'failed']).optional(),
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
})

// 任务详情输入
const getJobInputSchema = z.object({
  id: z.string().min(1),
})

export const evalJobsRouter = router({
/**
   * 创建评测任务 - 同步执行评测
   * Phase 9.1: 改为同步执行，不再使用队列
   */
  create: publicProcedure
    .input(createJobInputSchema)
    .mutation(async ({ input }) => {
      // 1. 获取评测器
      const evaluators = await prisma.evaluatorTemplate.findMany({
        where: { id: { in: input.evaluatorIds }, isActive: true },
      })
      
      if (evaluators.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '没有找到可用的评测器',
        })
      }
      
      // 2. 获取要评测的 Traces
      let traces: { id: string; input: string; output: string }[] = []
      
      if (input.sourceType === 'trace' && input.traceIds?.length === 1) {
        const trace = await queryTraceById(input.traceIds[0])
        if (trace) {
          traces = [{ id: trace.id, input: trace.input, output: trace.output }]
        }
      } else if (input.sourceType === 'traces' && input.traceIds) {
        // 多个 Traces
        for (const traceId of input.traceIds) {
          const trace = await queryTraceById(traceId)
          if (trace) {
            traces.push({ id: trace.id, input: trace.input, output: trace.output })
          }
        }
      } else if (input.sourceType === 'dataset' && input.datasetId) {
        // 从 Dataset 获取
        const items = await prisma.datasetItem.findMany({
          where: { datasetId: input.datasetId },
        })
        traces = items.map(item => ({
          id: item.traceId || item.id,
          input: JSON.stringify(item.input),
          output: JSON.stringify(item.output || {}),
        }))
      }
      
      if (traces.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '没有找到要评测的数据',
        })
      }
      
      // 3. 计算总任务数 (每个 Trace × 每个 Evaluator)
      const totalCount = traces.length * evaluators.length
      
      // 4. 创建 EvalJob 记录 - 状态为 running
      const job = await prisma.evalJob.create({
        data: {
          projectId: input.projectId,
          name: input.name || `评测任务 ${new Date().toLocaleString('zh-CN')}`,
          sourceType: input.sourceType,
          sourceId: input.datasetId || input.traceIds?.join(','),
          evalConfigId: null,
          totalCount,
          status: 'running',
          startedAt: new Date(),
        },
      })
      
      // 5. 构建评测任务列表
      const tasks: EvalTaskData[] = []
      
      for (const trace of traces) {
        for (const evaluator of evaluators) {
          tasks.push({
            traceId: trace.id,
            traceInput: trace.input,
            traceOutput: trace.output,
            evaluatorId: evaluator.id,
            evaluatorName: evaluator.name,
            promptTemplate: evaluator.promptTemplate,
            projectId: input.projectId,
            evalJobId: job.id,  // 关联评测任务 ID
          })
        }
      }
      
      // 6. 同步执行评测
      try {
        const { successCount, failedCount } = await executeEvaluationBatch(
          tasks,
          input.llmConfigId
        )
        
        // 7. 更新任务状态为 completed
        await prisma.evalJob.update({
          where: { id: job.id },
          data: { 
            status: failedCount === totalCount ? 'failed' : 'completed',
            completedCount: successCount,
            failedCount: failedCount,
            completedAt: new Date(),
          },
        })
        
        return {
          id: job.id,
          totalCount,
          completedCount: successCount,
          failedCount,
          status: failedCount === totalCount ? 'failed' : 'completed',
        }
      } catch (error) {
        // 评测执行失败
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        await prisma.evalJob.update({
          where: { id: job.id },
          data: { 
            status: 'failed',
            errorMessage,
            completedAt: new Date(),
          },
        })
        
        return {
          id: job.id,
          totalCount,
          completedCount: 0,
          failedCount: totalCount,
          status: 'failed',
          errorMessage,
        }
      }
    }),

  /**
   * 获取评测任务列表
   */
  list: publicProcedure
    .input(listJobsInputSchema)
    .query(async ({ input }) => {
      const where: { projectId: string; status?: string } = {
        projectId: input.projectId,
      }
      
      if (input.status) {
        where.status = input.status
      }
      
      const [jobs, total] = await Promise.all([
        prisma.evalJob.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: input.limit,
          skip: input.offset,
        }),
        prisma.evalJob.count({ where }),
      ])
      
      return {
        jobs: jobs.map(job => ({
          id: job.id,
          name: job.name,
          status: job.status,
          totalCount: job.totalCount,
          completedCount: job.completedCount,
          failedCount: job.failedCount,
          errorMessage: job.errorMessage,
          progress: job.totalCount > 0
            ? Math.round((job.completedCount / job.totalCount) * 100) 
            : 0,
          startedAt: job.startedAt?.toISOString(),
          completedAt: job.completedAt?.toISOString(),
          createdAt: job.createdAt.toISOString(),
        })),
        total,
        limit: input.limit,
        offset: input.offset,
      }
    }),

  /**
   * 获取评测任务详情
   */
  getById: publicProcedure
    .input(getJobInputSchema)
    .query(async ({ input }) => {
      const job = await prisma.evalJob.findUnique({
        where: { id: input.id },
      })
      
      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '评测任务不存在',
        })
      }
      
      return {
        id: job.id,
        name: job.name,
        sourceType: job.sourceType,
        sourceId: job.sourceId,
        status: job.status,
        totalCount: job.totalCount,
        completedCount: job.completedCount,
        failedCount: job.failedCount,
        progress: job.totalCount > 0 
          ? Math.round((job.completedCount / job.totalCount) * 100) 
          : 0,
        errorMessage: job.errorMessage,
        startedAt: job.startedAt?.toISOString(),
        completedAt: job.completedAt?.toISOString(),
        createdAt: job.createdAt.toISOString(),
      }
    }),

  /**
   * 获取队列状态
   */
  queueStatus: publicProcedure.query(async () => {
    return getQueueStatus()
  }),
})

export type EvalJobsRouter = typeof evalJobsRouter
