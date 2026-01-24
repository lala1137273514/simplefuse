/**
 * Traces tRPC 测试 - TDD
 * 
 * 测试 traces.list 和 traces.getById 路由
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// 导入路由和 tRPC 配置
import { tracesRouter } from '../server/routers/traces'
import { router, createContext } from '../server/trpc'

// Mock ClickHouse 查询模块
vi.mock('../lib/clickhouse', () => ({
  queryTraces: vi.fn().mockResolvedValue({
    traces: [
      {
        id: 'trace-001',
        project_id: 'project-abc',
        dify_connection_id: '',
        workflow_name: 'test-workflow',
        name: '测试对话',
        timestamp: '2026-01-24 12:00:00.000',
        user_id: null,
        session_id: null,
        input: '{"message": "你好"}',
        output: '{"response": "你好！"}',
        metadata: {},
        tags: ['test'],
        total_tokens: 100,
        latency_ms: 500,
        status: 'success',
        created_at: '2026-01-24 12:00:00.000',
      },
      {
        id: 'trace-002',
        project_id: 'project-abc',
        dify_connection_id: '',
        workflow_name: 'test-workflow',
        name: '测试对话2',
        timestamp: '2026-01-24 13:00:00.000',
        user_id: null,
        session_id: null,
        input: '{"message": "再见"}',
        output: '{"response": "再见！"}',
        metadata: {},
        tags: ['test'],
        total_tokens: 80,
        latency_ms: 400,
        status: 'success',
        created_at: '2026-01-24 13:00:00.000',
      },
    ],
    total: 2,
  }),
  queryTraceById: vi.fn().mockResolvedValue({
    id: 'trace-001',
    project_id: 'project-abc',
    dify_connection_id: '',
    workflow_name: 'test-workflow',
    name: '测试对话',
    timestamp: '2026-01-24 12:00:00.000',
    user_id: null,
    session_id: null,
    input: '{"message": "你好"}',
    output: '{"response": "你好！"}',
    metadata: {},
    tags: ['test'],
    total_tokens: 100,
    latency_ms: 500,
    status: 'success',
    created_at: '2026-01-24 12:00:00.000',
  }),
}))

describe('traces tRPC router', () => {
  // 创建完整的 app router
  const appRouter = router({
    traces: tracesRouter,
  })
  
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('traces.list', () => {
    it('应该返回 Trace 列表', async () => {
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)
      
      const result = await caller.traces.list({
        projectId: 'project-abc',
      })
      
      expect(result.traces).toBeDefined()
      expect(result.traces.length).toBe(2)
      expect(result.total).toBe(2)
    })

    it('应该支持分页参数', async () => {
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)
      
      const result = await caller.traces.list({
        projectId: 'project-abc',
        limit: 10,
        offset: 0,
      })
      
      expect(result.traces).toBeDefined()
      expect(result.limit).toBe(10)
      expect(result.offset).toBe(0)
    })

    it('应该支持按状态筛选', async () => {
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)
      
      const result = await caller.traces.list({
        projectId: 'project-abc',
        status: 'success',
      })
      
      expect(result.traces).toBeDefined()
    })
  })

  describe('traces.getById', () => {
    it('应该返回指定 ID 的 Trace 详情', async () => {
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)
      
      const result = await caller.traces.getById({
        id: 'trace-001',
      })
      
      expect(result).toBeDefined()
      expect(result.id).toBe('trace-001')
      expect(result.name).toBe('测试对话')
    })
  })
})
