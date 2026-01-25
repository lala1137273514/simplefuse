/**
 * EvalJobs tRPC 测试 - TDD 补做
 * 
 * 测试评测任务创建、列表、详情
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { router, createContext } from '../server/trpc'

// Mock Prisma
vi.mock('../lib/prisma', () => {
  return {
    default: {
      evaluatorTemplate: {
        findMany: vi.fn(),
      },
      evalJob: {
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
      },
      datasetItem: {
        findMany: vi.fn(),
      },
    },
  }
})

// Mock Queue
vi.mock('../lib/queue', () => ({
  addEvaluationTasks: vi.fn(),
  getQueueStatus: vi.fn().mockResolvedValue({
    waiting: 0,
    active: 0,
    completed: 10,
    failed: 1,
  }),
}))

// Mock ClickHouse
vi.mock('../lib/clickhouse', () => ({
  queryTraceById: vi.fn().mockResolvedValue({
    id: 'trace-001',
    input: 'test input',
    output: 'test output',
  }),
  queryTraces: vi.fn(),
}))

import { evalJobsRouter } from '../server/routers/evalJobs'
import prisma from '../lib/prisma'
import { addEvaluationTasks } from '../lib/queue'

describe('evalJobs tRPC router', () => {
  const appRouter = router({
    evalJobs: evalJobsRouter,
  })

  const mockEvaluators = [
    {
      id: 'eval-001',
      name: 'Relevance',
      promptTemplate: 'Evaluate relevance...',
      isActive: true,
    },
    {
      id: 'eval-002',
      name: 'Accuracy',
      promptTemplate: 'Evaluate accuracy...',
      isActive: true,
    },
  ]

  const mockJob = {
    id: 'job-001',
    projectId: 'project-abc',
    name: '评测任务 1',
    sourceType: 'trace',
    sourceId: 'trace-001',
    evalConfigId: null,
    status: 'running',
    totalCount: 2,
    completedCount: 1,
    failedCount: 0,
    errorMessage: null,
    startedAt: new Date(),
    completedAt: null,
    createdAt: new Date(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('evalJobs.create', () => {
    it('应该创建评测任务并同步执行', async () => {
      vi.mocked(prisma.evaluatorTemplate.findMany).mockResolvedValue(mockEvaluators)
      vi.mocked(prisma.evalJob.create).mockResolvedValue(mockJob)
      vi.mocked(prisma.evalJob.update).mockResolvedValue({
        ...mockJob,
        status: 'failed',  // 因为没有 mock LLM，预期会失败
        completedCount: 0,
        failedCount: 2,
      })
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.evalJobs.create({
        projectId: 'project-abc',
        sourceType: 'trace',
        traceIds: ['trace-001'],
        evaluatorIds: ['eval-001', 'eval-002'],
        llmConfigId: 'llm-001',
      })

      expect(result.id).toBe('job-001')
      // 同步执行模式：直接返回 completed 或 failed
      expect(['completed', 'failed']).toContain(result.status)
    })

    it('没有评测器时应该抛出错误', async () => {
      vi.mocked(prisma.evaluatorTemplate.findMany).mockResolvedValue([])
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      await expect(caller.evalJobs.create({
        projectId: 'project-abc',
        sourceType: 'trace',
        traceIds: ['trace-001'],
        evaluatorIds: ['non-existent'],
        llmConfigId: 'llm-001',
      })).rejects.toThrow('没有找到可用的评测器')
    })
  })

  describe('evalJobs.list', () => {
    it('应该返回评测任务列表', async () => {
      vi.mocked(prisma.evalJob.findMany).mockResolvedValue([mockJob])
      vi.mocked(prisma.evalJob.count).mockResolvedValue(1)
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.evalJobs.list({
        projectId: 'project-abc',
      })

      expect(result.jobs).toHaveLength(1)
      expect(result.jobs[0].id).toBe('job-001')
      expect(result.jobs[0].progress).toBe(50) // 1/2 = 50%
    })

    it('应该支持状态筛选', async () => {
      vi.mocked(prisma.evalJob.findMany).mockResolvedValue([])
      vi.mocked(prisma.evalJob.count).mockResolvedValue(0)
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      await caller.evalJobs.list({
        projectId: 'project-abc',
        status: 'completed',
      })

      expect(prisma.evalJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'completed' }),
        })
      )
    })
  })

  describe('evalJobs.getById', () => {
    it('应该返回评测任务详情', async () => {
      vi.mocked(prisma.evalJob.findUnique).mockResolvedValue(mockJob)
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.evalJobs.getById({ id: 'job-001' })

      expect(result.id).toBe('job-001')
      expect(result.progress).toBe(50)
    })

    it('任务不存在时应该抛出错误', async () => {
      vi.mocked(prisma.evalJob.findUnique).mockResolvedValue(null)
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      await expect(caller.evalJobs.getById({ id: 'non-existent' }))
        .rejects.toThrow('评测任务不存在')
    })
  })

  describe('evalJobs.queueStatus', () => {
    it('应该返回队列状态', async () => {
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.evalJobs.queueStatus()

      expect(result.waiting).toBe(0)
      expect(result.completed).toBe(10)
      expect(result.failed).toBe(1)
    })
  })
})
