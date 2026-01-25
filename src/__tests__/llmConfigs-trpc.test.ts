/**
 * LLM 配置 tRPC 测试 - TDD
 * 
 * 测试 llmConfigs.list, create, update, delete, setDefault
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { router, createContext } from '../server/trpc'

// Mock Prisma
vi.mock('../lib/prisma', () => {
  return {
    default: {
      llmConfig: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
      },
    },
    prisma: {
      llmConfig: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
      },
    },
  }
})

// 在 mock 之后导入
import { llmConfigsRouter } from '../server/routers/llmConfigs'
import prisma from '../lib/prisma'

// Mock global fetch for testConnection tests
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('llmConfigs tRPC router', () => {
  const appRouter = router({
    llmConfigs: llmConfigsRouter,
  })

  const mockLlmConfigs = [
    {
      id: 'llm-001',
      projectId: 'project-abc',
      name: 'OpenAI GPT-4',
      provider: 'openai',
      modelName: 'gpt-4-turbo',
      apiEndpoint: null,
      apiKeyEncrypted: 'encrypted-key-xxx',
      config: { temperature: 0.7 },
      isDefault: true,
      createdAt: new Date('2026-01-24'),
    },
    {
      id: 'llm-002',
      projectId: 'project-abc',
      name: '通义千问',
      provider: 'dashscope',
      modelName: 'qwen-max',
      apiEndpoint: null,
      apiKeyEncrypted: 'encrypted-key-yyy',
      config: null,
      isDefault: false,
      createdAt: new Date('2026-01-24'),
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('llmConfigs.list', () => {
    it('应该返回项目的 LLM 配置列表', async () => {
      vi.mocked(prisma.llmConfig.findMany).mockResolvedValue(mockLlmConfigs)
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.llmConfigs.list({
        projectId: 'project-abc',
      })

      expect(result.configs).toBeDefined()
      expect(result.configs.length).toBe(2)
      expect(prisma.llmConfig.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId: 'project-abc' },
        })
      )
    })

    it('应该正确标识默认配置', async () => {
      vi.mocked(prisma.llmConfig.findMany).mockResolvedValue(mockLlmConfigs)
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.llmConfigs.list({
        projectId: 'project-abc',
      })

      const defaultConfig = result.configs.find((c: { isDefault: boolean }) => c.isDefault)
      expect(defaultConfig?.name).toBe('OpenAI GPT-4')
    })
  })

  describe('llmConfigs.create', () => {
    it('应该成功创建 LLM 配置', async () => {
      const newConfig = {
        ...mockLlmConfigs[0],
        id: 'llm-new-001',
        name: '新配置',
      }
      vi.mocked(prisma.llmConfig.create).mockResolvedValue(newConfig)
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.llmConfigs.create({
        projectId: 'project-abc',
        name: '新配置',
        provider: 'openai',
        modelName: 'gpt-4-turbo',
        apiKey: 'sk-xxx',
      })

      expect(result).toBeDefined()
      expect(result.name).toBe('新配置')
    })
  })

  describe('llmConfigs.update', () => {
    it('应该成功更新 LLM 配置', async () => {
      vi.mocked(prisma.llmConfig.findUnique).mockResolvedValue(mockLlmConfigs[0])
      vi.mocked(prisma.llmConfig.update).mockResolvedValue({
        ...mockLlmConfigs[0],
        name: '更新后的配置',
      })
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.llmConfigs.update({
        id: 'llm-001',
        name: '更新后的配置',
      })

      expect(result).toBeDefined()
      expect(result.name).toBe('更新后的配置')
    })
  })

  describe('llmConfigs.delete', () => {
    it('应该成功删除 LLM 配置', async () => {
      vi.mocked(prisma.llmConfig.findUnique).mockResolvedValue(mockLlmConfigs[1])
      vi.mocked(prisma.llmConfig.delete).mockResolvedValue(mockLlmConfigs[1])
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.llmConfigs.delete({
        id: 'llm-002',
      })

      expect(result).toBeDefined()
      expect(result.success).toBe(true)
    })
  })

  describe('llmConfigs.setDefault', () => {
    it('应该设置默认 LLM 配置', async () => {
      vi.mocked(prisma.llmConfig.findUnique).mockResolvedValue(mockLlmConfigs[1])
      vi.mocked(prisma.llmConfig.updateMany).mockResolvedValue({ count: 1 })
      vi.mocked(prisma.llmConfig.update).mockResolvedValue({
        ...mockLlmConfigs[1],
        isDefault: true,
      })
      
      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.llmConfigs.setDefault({
        id: 'llm-002',
        projectId: 'project-abc',
      })

      expect(result).toBeDefined()
      expect(result.isDefault).toBe(true)
    })
  })

  describe('llmConfigs.testConnection', () => {
    it('应该测试 LLM 连接是否成功', async () => {
      // Setup fetch mock for successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })

      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.llmConfigs.testConnection({
        provider: 'openai',
        apiEndpoint: 'https://api.openai.com/v1',
        apiKey: 'sk-test-key',
        modelName: 'gpt-4',
      })

      expect(result).toBeDefined()
      expect(result.success).toBe(true)
      expect(result.message).toContain('连接成功')
    })

    it('应该在 API Key 无效时返回失败', async () => {
      // Setup fetch mock for 401 response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Invalid API Key' } }),
      })

      const ctx = await createContext()
      const caller = appRouter.createCaller(ctx)

      const result = await caller.llmConfigs.testConnection({
        provider: 'openai',
        apiEndpoint: 'https://api.openai.com/v1',
        apiKey: 'invalid-key',
        modelName: 'gpt-4',
      })

      expect(result.success).toBe(false)
      expect(result.message).toBeDefined()
    })
  })
})

