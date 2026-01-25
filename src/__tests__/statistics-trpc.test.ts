/**
 * Dashboard 统计 & 趋势 tRPC 测试 - TDD RED Phase
 * 
 * Task 5.1: 统计 API (总量/平均分/Token/延迟)
 * Task 5.2: 趋势 API (评分趋势/维度平均/延迟分布)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { router, createContext } from '../server/trpc'

// Mock ClickHouse
vi.mock('../lib/clickhouse', () => ({
  getClickHouseClient: vi.fn(() => ({
    query: vi.fn(),
  })),
}))

import { statisticsRouter } from '../server/routers/statistics'
import { getClickHouseClient } from '../lib/clickhouse'

describe('statistics tRPC router', () => {
  const appRouter = router({
    statistics: statisticsRouter,
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('statistics.overview (Task 5.1)', () => {
    it('应该返回总量统计数据', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({
          json: () => Promise.resolve([{
            total_traces: '1500',
            total_evaluations: '3200',
            total_tokens: '1250000',
            avg_latency_ms: '450.5',
          }]),
        }),
      }
      vi.mocked(getClickHouseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getClickHouseClient>)

      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.statistics.overview({
        projectId: 'project-abc',
        timeRange: '7d',
      })

      expect(result.totalTraces).toBe(1500)
      expect(result.totalEvaluations).toBe(3200)
      expect(result.totalTokens).toBe(1250000)
      expect(result.avgLatencyMs).toBeCloseTo(450.5)
    })

    it('应该返回平均分统计', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({
          json: () => Promise.resolve([{
            avg_score: '7.85',
            min_score: '2.0',
            max_score: '10.0',
          }]),
        }),
      }
      vi.mocked(getClickHouseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getClickHouseClient>)

      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.statistics.scoreStats({
        projectId: 'project-abc',
        timeRange: '7d',
      })

      expect(result.avgScore).toBeCloseTo(7.85)
      expect(result.minScore).toBe(2.0)
      expect(result.maxScore).toBe(10.0)
    })

    it('应该返回延迟分位数统计', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({
          json: () => Promise.resolve([{
            p50: '320',
            p90: '850',
            p99: '1500',
          }]),
        }),
      }
      vi.mocked(getClickHouseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getClickHouseClient>)

      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.statistics.latencyPercentiles({
        projectId: 'project-abc',
        timeRange: '7d',
      })

      expect(result.p50).toBe(320)
      expect(result.p90).toBe(850)
      expect(result.p99).toBe(1500)
    })
  })

  describe('statistics.trends (Task 5.2)', () => {
    it('应该返回评分趋势数据', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({
          json: () => Promise.resolve([
            { date: '2026-01-18', avg_score: '7.2' },
            { date: '2026-01-19', avg_score: '7.5' },
            { date: '2026-01-20', avg_score: '7.8' },
          ]),
        }),
      }
      vi.mocked(getClickHouseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getClickHouseClient>)

      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.statistics.scoreTrend({
        projectId: 'project-abc',
        timeRange: '7d',
      })

      expect(result.data).toHaveLength(3)
      expect(result.data[0].date).toBe('2026-01-18')
      expect(result.data[0].avgScore).toBeCloseTo(7.2)
    })

    it('应该返回各维度平均分数据', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({
          json: () => Promise.resolve([
            { evaluator_name: 'Relevance', avg_score: '8.2' },
            { evaluator_name: 'Accuracy', avg_score: '7.5' },
            { evaluator_name: 'Coherence', avg_score: '8.0' },
          ]),
        }),
      }
      vi.mocked(getClickHouseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getClickHouseClient>)

      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.statistics.dimensionScores({
        projectId: 'project-abc',
        timeRange: '7d',
      })

      expect(result.dimensions).toHaveLength(3)
      expect(result.dimensions[0].name).toBe('Relevance')
      expect(result.dimensions[0].avgScore).toBeCloseTo(8.2)
    })

    it('应该返回延迟分布数据', async () => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({
          json: () => Promise.resolve([
            { bucket: '0-100', count: '50' },
            { bucket: '100-500', count: '120' },
            { bucket: '500-1000', count: '80' },
            { bucket: '1000+', count: '20' },
          ]),
        }),
      }
      vi.mocked(getClickHouseClient).mockReturnValue(mockClient as unknown as ReturnType<typeof getClickHouseClient>)

      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.statistics.latencyDistribution({
        projectId: 'project-abc',
        timeRange: '7d',
      })

      expect(result.buckets).toHaveLength(4)
      expect(result.buckets[0].range).toBe('0-100')
      expect(result.buckets[0].count).toBe(50)
    })
  })
})
