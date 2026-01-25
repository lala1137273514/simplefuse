/**
 * Evaluators tRPC Router
 * 处理评测器 CRUD 相关的 API
 */

import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import prisma from '@/lib/prisma'
import { TRPCError } from '@trpc/server'

// 列表查询输入验证
const listInputSchema = z.object({
  type: z.enum(['preset', 'custom', 'all']).optional().default('all'),
  projectId: z.string().optional(),
  isActive: z.boolean().optional(),
})

// 详情查询输入验证
const getByIdInputSchema = z.object({
  id: z.string().min(1),
})

// 创建评测器输入验证
const createInputSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  promptTemplate: z.string().min(10),
  scoreType: z.enum(['numeric', 'categorical', 'boolean']).optional().default('numeric'),
  minScore: z.number().min(0).optional().default(0),
  maxScore: z.number().max(100).optional().default(10),
  categories: z.array(z.string()).optional(),
})

// 更新评测器输入验证
const updateInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  promptTemplate: z.string().min(10).optional(),
  scoreType: z.enum(['numeric', 'categorical', 'boolean']).optional(),
  minScore: z.number().min(0).optional(),
  maxScore: z.number().max(100).optional(),
  categories: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
})

// 删除评测器输入验证
const deleteInputSchema = z.object({
  id: z.string().min(1),
})

/**
 * 转换评测器记录为前端格式
 */
type EvaluatorRecord = {
  id: string
  projectId: string | null
  name: string
  description: string | null
  promptTemplate: string
  outputSchema: unknown
  scoreType: string
  minScore: number
  maxScore: number
  categories: unknown
  isPreset: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

function transformEvaluator(record: EvaluatorRecord) {
  return {
    id: record.id,
    projectId: record.projectId,
    name: record.name,
    description: record.description,
    promptTemplate: record.promptTemplate,
    outputSchema: record.outputSchema,
    scoreType: record.scoreType,
    minScore: record.minScore,
    maxScore: record.maxScore,
    categories: record.categories,
    isPreset: record.isPreset,
    isActive: record.isActive,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

export const evaluatorsRouter = router({
  /**
   * 获取评测器列表
   */
  list: publicProcedure
    .input(listInputSchema)
    .query(async ({ input }) => {
      const where: {
        isPreset?: boolean
        projectId?: string | null
        isActive?: boolean
      } = {}

      // 根据类型筛选
      if (input.type === 'preset') {
        where.isPreset = true
      } else if (input.type === 'custom') {
        where.isPreset = false
        if (input.projectId) {
          where.projectId = input.projectId
        }
      }

      // 激活状态筛选
      if (input.isActive !== undefined) {
        where.isActive = input.isActive
      }

      const evaluators = await prisma.evaluatorTemplate.findMany({
        where,
        orderBy: [
          { isPreset: 'desc' },
          { createdAt: 'desc' },
        ],
      })

      return {
        evaluators: evaluators.map(transformEvaluator),
        total: evaluators.length,
      }
    }),

  /**
   * 根据 ID 获取评测器详情
   */
  getById: publicProcedure
    .input(getByIdInputSchema)
    .query(async ({ input }) => {
      const evaluator = await prisma.evaluatorTemplate.findUnique({
        where: { id: input.id },
      })

      if (!evaluator) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '评测器不存在',
        })
      }

      return transformEvaluator(evaluator)
    }),

  /**
   * 创建自定义评测器
   */
  create: publicProcedure
    .input(createInputSchema)
    .mutation(async ({ input }) => {
      const evaluator = await prisma.evaluatorTemplate.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          description: input.description,
          promptTemplate: input.promptTemplate,
          scoreType: input.scoreType,
          minScore: input.minScore,
          maxScore: input.maxScore,
          categories: input.categories,
          isPreset: false, // 用户创建的都是非预置
          isActive: true,
        },
      })

      return transformEvaluator(evaluator)
    }),

  /**
   * 更新评测器
   */
  update: publicProcedure
    .input(updateInputSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input

      // 检查评测器是否存在
      const existing = await prisma.evaluatorTemplate.findUnique({
        where: { id },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '评测器不存在',
        })
      }

      const evaluator = await prisma.evaluatorTemplate.update({
        where: { id },
        data,
      })

      return transformEvaluator(evaluator)
    }),

  /**
   * 删除评测器
   */
  delete: publicProcedure
    .input(deleteInputSchema)
    .mutation(async ({ input }) => {
      // 检查评测器是否存在
      const existing = await prisma.evaluatorTemplate.findUnique({
        where: { id: input.id },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '评测器不存在',
        })
      }

      // 预置评测器不可删除
      if (existing.isPreset) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: '预置评测器不可删除',
        })
      }

      await prisma.evaluatorTemplate.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),
})

export type EvaluatorsRouter = typeof evaluatorsRouter
