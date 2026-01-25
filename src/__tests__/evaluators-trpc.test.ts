/**
 * 评测器 tRPC 测试 - TDD
 * 
 * 测试 evaluators.list, getById, create, update, delete
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { router, createContext } from '../server/trpc'

// Mock Prisma - 使用内联对象，不引用外部变量
vi.mock('../lib/prisma', () => {
  return {
    default: {
      evaluatorTemplate: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    },
    prisma: {
      evaluatorTemplate: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    },
  }
})

// 在 mock 之后导入
import { evaluatorsRouter } from '../server/routers/evaluators'
import prisma from '../lib/prisma'

describe('evaluators tRPC router', () => {
  // 创建完整的 app router
  const appRouter = router({
    evaluators: evaluatorsRouter,
  })

  const mockPresetEvaluators = [
    {
      id: 'eval-001',
      projectId: null,
      name: 'Relevance (相关性)',
      description: '评估 AI 回复与用户问题的相关程度',
      promptTemplate: '你是一个专业的 AI 评测专家...',
      outputSchema: null,
      scoreType: 'numeric',
      minScore: 0,
      maxScore: 10,
      categories: null,
      isPreset: true,
      isActive: true,
      createdAt: new Date('2026-01-24'),
      updatedAt: new Date('2026-01-24'),
    },
    {
      id: 'eval-002',
      projectId: null,
      name: 'Accuracy (准确性)',
      description: '评估 AI 回复中信息的事实准确性',
      promptTemplate: '你是一个专业的 AI 评测专家...',
      outputSchema: null,
      scoreType: 'numeric',
      minScore: 0,
      maxScore: 10,
      categories: null,
      isPreset: true,
      isActive: true,
      createdAt: new Date('2026-01-24'),
      updatedAt: new Date('2026-01-24'),
    },
  ]

  const mockCustomEvaluator = {
    id: 'eval-custom-001',
    projectId: 'project-abc',
    name: '自定义评测器',
    description: '项目专属评测器',
    promptTemplate: '请评估以下内容...',
    outputSchema: null,
    scoreType: 'numeric',
    minScore: 0,
    maxScore: 10,
    categories: null,
    isPreset: false,
    isActive: true,
    createdAt: new Date('2026-01-24'),
    updatedAt: new Date('2026-01-24'),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('evaluators.list', () => {
    it('应该返回预置评测器列表', async () => {
      vi.mocked(prisma.evaluatorTemplate.findMany).mockResolvedValue(mockPresetEvaluators)
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.evaluators.list({
        type: 'preset',
      })

      expect(result.evaluators).toBeDefined()
      expect(result.evaluators.length).toBe(2)
      expect(prisma.evaluatorTemplate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isPreset: true }),
        })
      )
    })

    it('应该返回项目自定义评测器列表', async () => {
      vi.mocked(prisma.evaluatorTemplate.findMany).mockResolvedValue([mockCustomEvaluator])
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.evaluators.list({
        type: 'custom',
        projectId: 'project-abc',
      })

      expect(result.evaluators).toBeDefined()
      expect(result.evaluators.length).toBe(1)
      expect(result.evaluators[0].isPreset).toBe(false)
    })
  })

  describe('evaluators.getById', () => {
    it('应该返回指定 ID 的评测器详情', async () => {
      vi.mocked(prisma.evaluatorTemplate.findUnique).mockResolvedValue(mockPresetEvaluators[0])
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.evaluators.getById({
        id: 'eval-001',
      })

      expect(result).toBeDefined()
      expect(result.id).toBe('eval-001')
      expect(result.name).toBe('Relevance (相关性)')
    })
  })

  describe('evaluators.create', () => {
    it('应该成功创建自定义评测器', async () => {
      const newEvaluator = {
        ...mockCustomEvaluator,
        id: 'eval-new-001',
      }
      vi.mocked(prisma.evaluatorTemplate.create).mockResolvedValue(newEvaluator)
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.evaluators.create({
        projectId: 'project-abc',
        name: '自定义评测器',
        description: '项目专属评测器',
        promptTemplate: '请评估以下内容...',
        scoreType: 'numeric',
        minScore: 0,
        maxScore: 10,
      })

      expect(result).toBeDefined()
      expect(result.name).toBe('自定义评测器')
      expect(result.isPreset).toBe(false)
    })
  })

  describe('evaluators.update', () => {
    it('应该成功更新自定义评测器', async () => {
      vi.mocked(prisma.evaluatorTemplate.findUnique).mockResolvedValue(mockCustomEvaluator)
      vi.mocked(prisma.evaluatorTemplate.update).mockResolvedValue({
        ...mockCustomEvaluator,
        name: '更新后的评测器',
      })
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.evaluators.update({
        id: 'eval-custom-001',
        name: '更新后的评测器',
      })

      expect(result).toBeDefined()
      expect(result.name).toBe('更新后的评测器')
    })
  })

  describe('evaluators.delete', () => {
    it('应该成功删除自定义评测器', async () => {
      vi.mocked(prisma.evaluatorTemplate.findUnique).mockResolvedValue(mockCustomEvaluator)
      vi.mocked(prisma.evaluatorTemplate.delete).mockResolvedValue(mockCustomEvaluator)
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.evaluators.delete({
        id: 'eval-custom-001',
      })

      expect(result).toBeDefined()
      expect(result.success).toBe(true)
    })

    it('应该拒绝删除预置评测器', async () => {
      vi.mocked(prisma.evaluatorTemplate.findUnique).mockResolvedValue(mockPresetEvaluators[0])
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      await expect(
        caller.evaluators.delete({
          id: 'eval-001',
        })
      ).rejects.toThrow('预置评测器不可删除')
    })
  })
})
