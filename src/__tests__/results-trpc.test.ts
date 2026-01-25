/**
 * Results tRPC 测试 - TDD RED Phase
 * 
 * Task 6.4: 评测结果页面
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { router, createContext } from '../server/trpc'

// Mock ClickHouse
vi.mock('../lib/clickhouse', () => ({
  getClickHouseClient: vi.fn(() => ({
    query: vi.fn(),
  })),
}))

import { resultsRouter } from '../server/routers/results'
import { getClickHouseClient } from '../lib/clickhouse'

describe('results tRPC router', () => {
  const appRouter = router({
    results: resultsRouter,
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('results.list', () => {
    it('应该返回评测结果列表', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({
          json: () => Promise.resolve([
            {
              id: 'score-001',
              trace_id: 'trace-001',
              evaluator_name: 'Relevance',
              score: '8.5',
              reasoning: '回复相关性较高',
              created_at: '2026-01-24 10:30:00',
            },
            {
              id: 'score-002',
              trace_id: 'trace-002',
              evaluator_name: 'Accuracy',
              score: '7.2',
              reasoning: '部分信息需要验证',
              created_at: '2026-01-24 10:31:00',
            },
          ]),
        }),
      }
      vi.mocked(getClickHouseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getClickHouseClient>)

      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.results.list({
        projectId: 'project-abc',
      })

      expect(result.results).toHaveLength(2)
      expect(result.results[0].evaluatorName).toBe('Relevance')
      expect(result.results[0].score).toBe(8.5)
    })

    it('应该支持按评测器筛选', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({
          json: () => Promise.resolve([
            {
              id: 'score-001',
              trace_id: 'trace-001',
              evaluator_name: 'Relevance',
              score: '8.5',
              reasoning: '回复相关性较高',
              created_at: '2026-01-24 10:30:00',
            },
          ]),
        }),
      }
      vi.mocked(getClickHouseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getClickHouseClient>)

      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      await caller.results.list({
        projectId: 'project-abc',
        evaluatorName: 'Relevance',
      })

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.objectContaining({
          query_params: expect.objectContaining({
            evaluatorName: 'Relevance',
          }),
        })
      )
    })
  })

  describe('results.getByTraceId', () => {
    it('应该返回指定 Trace 的所有评测结果', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({
          json: () => Promise.resolve([
            {
              id: 'score-001',
              trace_id: 'trace-001',
              evaluator_name: 'Relevance',
              score: '8.5',
              reasoning: '回复相关性较高',
              created_at: '2026-01-24 10:30:00',
            },
            {
              id: 'score-002',
              trace_id: 'trace-001',
              evaluator_name: 'Accuracy',
              score: '7.8',
              reasoning: '信息准确',
              created_at: '2026-01-24 10:30:00',
            },
          ]),
        }),
      }
      vi.mocked(getClickHouseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getClickHouseClient>)

      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.results.getByTraceId({
        projectId: 'project-abc',
        traceId: 'trace-001',
      })

      expect(result.results).toHaveLength(2)
      expect(result.avgScore).toBeCloseTo(8.15)
    })
  })

  describe('results.summary', () => {
    it('应该返回评测结果汇总', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({
          json: () => Promise.resolve([
            {
              evaluator_name: 'Relevance',
              avg_score: '8.2',
              count: '150',
            },
            {
              evaluator_name: 'Accuracy',
              avg_score: '7.5',
              count: '150',
            },
          ]),
        }),
      }
      vi.mocked(getClickHouseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getClickHouseClient>)

      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.results.summary({
        projectId: 'project-abc',
        timeRange: '7d',
      })

      expect(result.dimensions).toHaveLength(2)
      expect(result.dimensions[0].avgScore).toBeCloseTo(8.2)
      expect(result.totalCount).toBe(300)
    })
  })
  describe('results.listByJobId', () => {
    it('应该返回指定任务的评测结果（按 Trace 分组）', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({
          json: () => Promise.resolve([
            {
              id: 'score-001',
              trace_id: 'trace-001',
              evaluator_id: 'eval-001',
              evaluator_name: 'Relevance',
              score: '8.5',
              reasoning: '回复相关性较高',
              created_at: '2026-01-24 10:30:00',
            },
            {
              id: 'score-002',
              trace_id: 'trace-001',
              evaluator_id: 'eval-002',
              evaluator_name: 'Accuracy',
              score: '7.8',
              reasoning: '信息准确',
              created_at: '2026-01-24 10:30:00',
            },
            {
              id: 'score-003',
              trace_id: 'trace-002',
              evaluator_id: 'eval-001',
              evaluator_name: 'Relevance',
              score: '9.0',
              reasoning: '非常相关',
              created_at: '2026-01-24 10:31:00',
            },
          ]),
        }),
      }
      vi.mocked(getClickHouseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getClickHouseClient>)

      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.results.listByJobId({
        projectId: 'project-abc',
        jobId: 'job-001',
      })

      // 应该按 Trace 分组返回
      expect(result.traces).toHaveLength(2)
      expect(result.traces[0].traceId).toBe('trace-001')
      expect(result.traces[0].scores).toHaveLength(2)
      expect(result.traces[1].traceId).toBe('trace-002')
      expect(result.traces[1].scores).toHaveLength(1)
    })
  })

  describe('results.getJobSummary', () => {
    it('应该返回任务的汇总统计', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({
          json: () => Promise.resolve([
            {
              evaluator_name: 'Relevance',
              avg_score: '8.5',
              count: '10',
              trace_count: '5',
            },
            {
              evaluator_name: 'Accuracy',
              avg_score: '7.8',
              count: '10',
              trace_count: '5',
            },
          ]),
        }),
      }
      vi.mocked(getClickHouseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getClickHouseClient>)

      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.results.getJobSummary({
        projectId: 'project-abc',
        jobId: 'job-001',
      })

      expect(result.evaluators).toHaveLength(2)
      expect(result.evaluators[0].name).toBe('Relevance')
      expect(result.evaluators[0].avgScore).toBeCloseTo(8.5)
      expect(result.totalTraces).toBeGreaterThan(0)
    })
  })
})
