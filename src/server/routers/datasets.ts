/**
 * Datasets tRPC Router
 * 评测集 CRUD API
 * 
 * Task 5.4: 评测集 CRUD
 * Task 5.5: 从 Trace 创建评测集
 */

import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import prisma from '@/lib/prisma'
import { TRPCError } from '@trpc/server'
import { queryTraces } from '@/lib/clickhouse'

// 列表查询输入
const listInputSchema = z.object({
  projectId: z.string().min(1),
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
})

// 创建评测集输入
const createInputSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
})

// 更新评测集输入
const updateInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
})

// 添加条目输入 (Task 5.5)
const addItemsInputSchema = z.object({
  datasetId: z.string().min(1),
  traceIds: z.array(z.string()).min(1),
})

export const datasetsRouter = router({
  /**
   * 获取评测集列表
   */
  list: publicProcedure
    .input(listInputSchema)
    .query(async ({ input }) => {
      const [datasets, total] = await Promise.all([
        prisma.dataset.findMany({
          where: { projectId: input.projectId },
          orderBy: { createdAt: 'desc' },
          take: input.limit,
          skip: input.offset,
          include: {
            _count: {
              select: { items: true },
            },
          },
        }),
        prisma.dataset.count({ where: { projectId: input.projectId } }),
      ])

      return {
        datasets: datasets.map(d => ({
          id: d.id,
          name: d.name,
          description: d.description,
          createdAt: d.createdAt.toISOString(),
          itemCount: d._count.items,
        })),
        total,
        limit: input.limit,
        offset: input.offset,
      }
    }),

  /**
   * 获取评测集详情及条目
   */
  getById: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ input }) => {
      const dataset = await prisma.dataset.findUnique({
        where: { id: input.id },
      })

      if (!dataset) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '评测集不存在',
        })
      }

      const [items, itemCount] = await Promise.all([
        prisma.datasetItem.findMany({
          where: { datasetId: input.id },
          orderBy: { createdAt: 'desc' },
          take: 100,
        }),
        prisma.datasetItem.count({ where: { datasetId: input.id } }),
      ])

      return {
        id: dataset.id,
        name: dataset.name,
        description: dataset.description,
        createdAt: dataset.createdAt.toISOString(),
        itemCount,
        items: items.map(item => ({
          id: item.id,
          traceId: item.traceId,
          input: item.input,
          output: item.output,
          expectedOutput: item.expectedOutput,
          createdAt: item.createdAt.toISOString(),
        })),
      }
    }),

  /**
   * 创建评测集
   */
  create: publicProcedure
    .input(createInputSchema)
    .mutation(async ({ input }) => {
      const dataset = await prisma.dataset.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          description: input.description,
        },
      })

      return {
        id: dataset.id,
        name: dataset.name,
        description: dataset.description,
        createdAt: dataset.createdAt.toISOString(),
      }
    }),

  /**
   * 更新评测集
   */
  update: publicProcedure
    .input(updateInputSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input

      const existing = await prisma.dataset.findUnique({ where: { id } })
      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '评测集不存在',
        })
      }

      const dataset = await prisma.dataset.update({
        where: { id },
        data,
      })

      return {
        id: dataset.id,
        name: dataset.name,
        description: dataset.description,
        createdAt: dataset.createdAt.toISOString(),
      }
    }),

  /**
   * 删除评测集
   */
  delete: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const existing = await prisma.dataset.findUnique({
        where: { id: input.id },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '评测集不存在',
        })
      }

      await prisma.dataset.delete({ where: { id: input.id } })

      return { success: true }
    }),

  /**
   * 从 Trace 添加条目到评测集 (Task 5.5)
   */
  addItems: publicProcedure
    .input(addItemsInputSchema)
    .mutation(async ({ input }) => {
      const dataset = await prisma.dataset.findUnique({
        where: { id: input.datasetId },
      })

      if (!dataset) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '评测集不存在',
        })
      }

      // 从 ClickHouse 获取 Trace 数据
      const result = await queryTraces({
        projectId: dataset.projectId,
        traceIds: input.traceIds,
      })

      if (result.traces.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '未找到指定的 Trace',
        })
      }

      // 批量创建条目
      const createResult = await prisma.datasetItem.createMany({
        data: result.traces.map(trace => ({
          datasetId: input.datasetId,
          traceId: trace.id,
          input: { input: trace.input },
          output: { output: trace.output },
        })),
        skipDuplicates: true,
      })

      return {
        addedCount: createResult.count,
      }
    }),

  /**
   * 从评测集删除条目
   */
  removeItem: publicProcedure
    .input(z.object({ itemId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await prisma.datasetItem.delete({
        where: { id: input.itemId },
      })

      return { success: true }
    }),
})

export type DatasetsRouter = typeof datasetsRouter
