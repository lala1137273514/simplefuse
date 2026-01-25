/**
 * Datasets tRPC 测试 - TDD RED Phase
 * 
 * Task 5.4: 评测集 CRUD
 * Task 5.5: 从 Trace 创建评测集
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { router, createContext } from '../server/trpc'

// Mock Prisma
vi.mock('../lib/prisma', () => ({
  default: {
    dataset: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    datasetItem: {
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}))

// Mock ClickHouse
vi.mock('../lib/clickhouse', () => ({
  queryTraces: vi.fn(),
  getClickHouseClient: vi.fn(),
}))

import { datasetsRouter } from '../server/routers/datasets'
import prisma from '../lib/prisma'
import { queryTraces } from '../lib/clickhouse'

describe('datasets tRPC router', () => {
  const appRouter = router({
    datasets: datasetsRouter,
  })

  const mockDataset = {
    id: 'dataset-001',
    projectId: 'project-abc',
    name: '测试评测集',
    description: '用于测试的评测集',
    createdAt: new Date('2026-01-24'),
    updatedAt: new Date('2026-01-24'),
  }

  const mockDatasetItems = [
    {
      id: 'item-001',
      datasetId: 'dataset-001',
      traceId: 'trace-001',
      input: { question: '你好' },
      output: { answer: '你好，有什么可以帮您？' },
      expectedOutput: null,
      metadata: null,
      createdAt: new Date('2026-01-24'),
    },
    {
      id: 'item-002',
      datasetId: 'dataset-001',
      traceId: 'trace-002',
      input: { question: '退款政策' },
      output: { answer: '我们支持7天无理由退款...' },
      expectedOutput: null,
      metadata: null,
      createdAt: new Date('2026-01-24'),
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('datasets.list', () => {
    it('应该返回评测集列表', async () => {
      vi.mocked(prisma.dataset.findMany).mockResolvedValue([mockDataset])
      vi.mocked(prisma.dataset.count).mockResolvedValue(1)
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.datasets.list({
        projectId: 'project-abc',
      })

      expect(result.datasets).toHaveLength(1)
      expect(result.datasets[0].name).toBe('测试评测集')
    })
  })

  describe('datasets.getById', () => {
    it('应该返回评测集详情及条目', async () => {
      vi.mocked(prisma.dataset.findUnique).mockResolvedValue(mockDataset)
      vi.mocked(prisma.datasetItem.findMany).mockResolvedValue(mockDatasetItems)
      vi.mocked(prisma.datasetItem.count).mockResolvedValue(2)
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.datasets.getById({ id: 'dataset-001' })

      expect(result.name).toBe('测试评测集')
      expect(result.items).toHaveLength(2)
      expect(result.itemCount).toBe(2)
    })

    it('评测集不存在时应该抛出错误', async () => {
      vi.mocked(prisma.dataset.findUnique).mockResolvedValue(null)
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      await expect(caller.datasets.getById({ id: 'non-existent' }))
        .rejects.toThrow('评测集不存在')
    })
  })

  describe('datasets.create', () => {
    it('应该成功创建评测集', async () => {
      vi.mocked(prisma.dataset.create).mockResolvedValue(mockDataset)
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.datasets.create({
        projectId: 'project-abc',
        name: '测试评测集',
        description: '用于测试的评测集',
      })

      expect(result.id).toBe('dataset-001')
      expect(result.name).toBe('测试评测集')
    })
  })

  describe('datasets.update', () => {
    it('应该成功更新评测集', async () => {
      vi.mocked(prisma.dataset.findUnique).mockResolvedValue(mockDataset)
      vi.mocked(prisma.dataset.update).mockResolvedValue({
        ...mockDataset,
        name: '更新后的名称',
      })
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.datasets.update({
        id: 'dataset-001',
        name: '更新后的名称',
      })

      expect(result.name).toBe('更新后的名称')
    })
  })

  describe('datasets.delete', () => {
    it('应该成功删除评测集', async () => {
      vi.mocked(prisma.dataset.findUnique).mockResolvedValue(mockDataset)
      vi.mocked(prisma.dataset.delete).mockResolvedValue(mockDataset)
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.datasets.delete({ id: 'dataset-001' })

      expect(result.success).toBe(true)
    })
  })

  describe('datasets.addItems (Task 5.5)', () => {
    it('应该从 Trace 添加条目到评测集', async () => {
      vi.mocked(prisma.dataset.findUnique).mockResolvedValue(mockDataset)
      vi.mocked(queryTraces).mockResolvedValue([
        { id: 'trace-001', input: '你好', output: '你好！' },
        { id: 'trace-002', input: '再见', output: '再见！' },
      ])
      vi.mocked(prisma.datasetItem.createMany).mockResolvedValue({ count: 2 })
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.datasets.addItems({
        datasetId: 'dataset-001',
        traceIds: ['trace-001', 'trace-002'],
      })

      expect(result.addedCount).toBe(2)
    })
  })

  describe('datasets.removeItem', () => {
    it('应该从评测集删除条目', async () => {
      vi.mocked(prisma.datasetItem.delete).mockResolvedValue(mockDatasetItems[0])
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.datasets.removeItem({ itemId: 'item-001' })

      expect(result.success).toBe(true)
    })
  })
})
