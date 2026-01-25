/**
 * Dify Connections tRPC 测试 - TDD RED Phase
 * 
 * Task 6.1: Dify 连接管理
 * Task 6.2: Webhook 集成
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { router, createContext } from '../server/trpc'

// Mock Prisma
vi.mock('../lib/prisma', () => ({
  default: {
    difyConnection: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}))

// Mock Dify API
vi.mock('../lib/dify', () => ({
  testDifyConnection: vi.fn(),
  fetchDifyWorkflows: vi.fn(),
  generateWebhookUrl: vi.fn((id: string) => `http://localhost:3000/api/webhook/${id}`),
  generateWebhookSecret: vi.fn(() => 'whsec_mock_secret_12345'),
}))

import { difyConnectionsRouter } from '../server/routers/difyConnections'
import prisma from '../lib/prisma'
import { testDifyConnection, fetchDifyWorkflows } from '../lib/dify'

describe('difyConnections tRPC router', () => {
  const appRouter = router({
    difyConnections: difyConnectionsRouter,
  })

  const mockConnection = {
    id: 'conn-001',
    projectId: 'project-abc',
    name: '生产环境 Dify',
    difyUrl: 'https://dify.example.com',
    apiKeyEncrypted: 'ZW5jcnlwdGVkLWFwaS1rZXk=', // base64 encoded
    webhookSecret: 'webhook-secret-123',
    workflows: [],
    isActive: true,
    autoEval: false,
    lastSyncAt: new Date('2026-01-24'),
    createdAt: new Date('2026-01-20'),
    updatedAt: new Date('2026-01-24'),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('difyConnections.list', () => {
    it('应该返回 Dify 连接列表', async () => {
      vi.mocked(prisma.difyConnection.findMany).mockResolvedValue([mockConnection])
      vi.mocked(prisma.difyConnection.count).mockResolvedValue(1)
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.difyConnections.list({
        projectId: 'project-abc',
      })

      expect(result.connections).toHaveLength(1)
      expect(result.connections[0].name).toBe('生产环境 Dify')
      expect(result.connections[0].apiKey).toBeUndefined() // API Key 不应返回
    })
  })

  describe('difyConnections.create', () => {
    it('应该成功创建 Dify 连接', async () => {
      vi.mocked(prisma.difyConnection.create).mockResolvedValue(mockConnection)
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.difyConnections.create({
        projectId: 'project-abc',
        name: '生产环境 Dify',
        difyUrl: 'https://dify.example.com',
        apiKey: 'dify-api-key-123',
      })

      expect(result.id).toBe('conn-001')
      expect(result.webhookUrl).toContain('/api/webhook/')
    })
  })

  describe('difyConnections.testConnection', () => {
    it('连接成功时应该返回 success', async () => {
      vi.mocked(prisma.difyConnection.findUnique).mockResolvedValue(mockConnection)
      vi.mocked(testDifyConnection).mockResolvedValue({ success: true, message: 'Connected' })
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.difyConnections.testConnection({ id: 'conn-001' })

      expect(result.success).toBe(true)
      expect(result.message).toBe('Connected')
    })

    it('连接失败时应该返回错误信息', async () => {
      vi.mocked(prisma.difyConnection.findUnique).mockResolvedValue(mockConnection)
      vi.mocked(testDifyConnection).mockResolvedValue({ success: false, message: 'Invalid API key' })
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.difyConnections.testConnection({ id: 'conn-001' })

      expect(result.success).toBe(false)
      expect(result.message).toBe('Invalid API key')
    })
  })

  describe('difyConnections.syncWorkflows', () => {
    it('应该同步 Dify 工作流列表', async () => {
      vi.mocked(prisma.difyConnection.findUnique).mockResolvedValue(mockConnection)
      vi.mocked(fetchDifyWorkflows).mockResolvedValue([
        { id: 'wf-001', name: '客服助手', description: '智能客服工作流' },
        { id: 'wf-002', name: '知识问答', description: '知识库问答工作流' },
      ])
      vi.mocked(prisma.difyConnection.update).mockResolvedValue(mockConnection)
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.difyConnections.syncWorkflows({ id: 'conn-001' })

      expect(result.workflows).toHaveLength(2)
      expect(result.workflows[0].name).toBe('客服助手')
    })
  })

  describe('difyConnections.regenerateWebhookSecret', () => {
    it('应该重新生成 Webhook Secret', async () => {
      vi.mocked(prisma.difyConnection.findUnique).mockResolvedValue(mockConnection)
      vi.mocked(prisma.difyConnection.update).mockResolvedValue({
        ...mockConnection,
        webhookSecret: 'new-webhook-secret',
      })
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.difyConnections.regenerateWebhookSecret({ id: 'conn-001' })

      // The router generates a new secret internally, so we check it was updated
      expect(result.webhookSecret).toBeDefined()
      expect(result.webhookSecret.startsWith('whsec_')).toBe(true)
    })
  })

  describe('difyConnections.delete', () => {
    it('应该成功删除 Dify 连接', async () => {
      vi.mocked(prisma.difyConnection.findUnique).mockResolvedValue(mockConnection)
      vi.mocked(prisma.difyConnection.delete).mockResolvedValue(mockConnection)
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.difyConnections.delete({ id: 'conn-001' })

      expect(result.success).toBe(true)
    })
  })
})
