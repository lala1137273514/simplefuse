/**
 * LLM Configs tRPC Router
 * 处理 LLM 配置 CRUD 相关的 API
 */

import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import prisma from '@/lib/prisma'
import { TRPCError } from '@trpc/server'

// 列表查询输入验证
const listInputSchema = z.object({
  projectId: z.string().min(1),
})

// 创建 LLM 配置输入验证
const createInputSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(100),
  provider: z.enum(['openai', 'azure', 'dashscope', 'ollama', 'custom']),
  modelName: z.string().min(1),
  apiEndpoint: z.string().url().optional(),
  apiKey: z.string().optional(), // 会被加密存储
  config: z.record(z.unknown()).optional(),
  isDefault: z.boolean().optional().default(false),
})

// 更新 LLM 配置输入验证
const updateInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  provider: z.enum(['openai', 'azure', 'dashscope', 'ollama', 'custom']).optional(),
  modelName: z.string().min(1).optional(),
  apiEndpoint: z.string().url().nullable().optional(),
  apiKey: z.string().optional(),
  config: z.record(z.unknown()).nullable().optional(),
})

// 删除输入验证
const deleteInputSchema = z.object({
  id: z.string().min(1),
})

// 设置默认输入验证
const setDefaultInputSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
})

/**
 * 简单的 API Key 加密 (生产环境应使用更安全的方案)
 */
function encryptApiKey(apiKey: string): string {
  // 简单的 base64 编码，生产环境应使用 AES 等加密
  return Buffer.from(apiKey).toString('base64')
}

/**
 * 转换配置记录为前端格式 (隐藏敏感信息)
 */
type LlmConfigRecord = {
  id: string
  projectId: string
  name: string
  provider: string
  modelName: string
  apiEndpoint: string | null
  apiKeyEncrypted: string | null
  config: unknown
  isDefault: boolean
  createdAt: Date
}

function transformConfig(record: LlmConfigRecord) {
  return {
    id: record.id,
    projectId: record.projectId,
    name: record.name,
    provider: record.provider,
    modelName: record.modelName,
    apiEndpoint: record.apiEndpoint,
    hasApiKey: !!record.apiKeyEncrypted, // 只返回是否有 API Key，不返回实际值
    config: record.config,
    isDefault: record.isDefault,
    createdAt: record.createdAt.toISOString(),
  }
}

export const llmConfigsRouter = router({
  /**
   * 获取项目的 LLM 配置列表
   */
  list: publicProcedure
    .input(listInputSchema)
    .query(async ({ input }) => {
      const configs = await prisma.llmConfig.findMany({
        where: { projectId: input.projectId },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'desc' },
        ],
      })

      return {
        configs: configs.map(transformConfig),
        total: configs.length,
      }
    }),

  /**
   * 创建 LLM 配置
   */
  create: publicProcedure
    .input(createInputSchema)
    .mutation(async ({ input }) => {
      const { apiKey, ...data } = input

      const config = await prisma.llmConfig.create({
        data: {
          ...data,
          apiKeyEncrypted: apiKey ? encryptApiKey(apiKey) : null,
        },
      })

      return transformConfig(config)
    }),

  /**
   * 更新 LLM 配置
   */
  update: publicProcedure
    .input(updateInputSchema)
    .mutation(async ({ input }) => {
      const { id, apiKey, ...data } = input

      // 检查配置是否存在
      const existing = await prisma.llmConfig.findUnique({
        where: { id },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'LLM 配置不存在',
        })
      }

      const updateData: Record<string, unknown> = { ...data }
      if (apiKey !== undefined) {
        updateData.apiKeyEncrypted = apiKey ? encryptApiKey(apiKey) : null
      }

      const config = await prisma.llmConfig.update({
        where: { id },
        data: updateData,
      })

      return transformConfig(config)
    }),

  /**
   * 删除 LLM 配置
   */
  delete: publicProcedure
    .input(deleteInputSchema)
    .mutation(async ({ input }) => {
      const existing = await prisma.llmConfig.findUnique({
        where: { id: input.id },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'LLM 配置不存在',
        })
      }

      await prisma.llmConfig.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  /**
   * 设置默认 LLM 配置
   */
  setDefault: publicProcedure
    .input(setDefaultInputSchema)
    .mutation(async ({ input }) => {
      const existing = await prisma.llmConfig.findUnique({
        where: { id: input.id },
      })

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'LLM 配置不存在',
        })
      }

      // 先将该项目所有配置的 isDefault 设为 false
      await prisma.llmConfig.updateMany({
        where: { projectId: input.projectId },
        data: { isDefault: false },
      })

      // 再将指定配置设为默认
      const config = await prisma.llmConfig.update({
        where: { id: input.id },
        data: { isDefault: true },
      })

      return transformConfig(config)
    }),

  /**
   * 测试 LLM 连接
   */
  testConnection: publicProcedure
    .input(z.object({
      provider: z.enum(['openai', 'azure', 'dashscope', 'ollama', 'custom']),
      apiEndpoint: z.string().optional(),
      apiKey: z.string(),
      modelName: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { provider, apiEndpoint, apiKey, modelName } = input

      // 根据 provider 获取默认 API 端点
      const endpoints: Record<string, string> = {
        openai: 'https://api.openai.com/v1',
        azure: apiEndpoint || '',
        dashscope: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        ollama: apiEndpoint || 'http://localhost:11434/v1',
        custom: apiEndpoint || '',
      }

      const endpoint = apiEndpoint || endpoints[provider]
      
      if (!endpoint) {
        return {
          success: false,
          message: '请提供 API 端点地址',
        }
      }

      try {
        // 调用 /models 端点验证连接
        const response = await fetch(`${endpoint}/models`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          return {
            success: true,
            message: `连接成功！模型: ${modelName}`,
          }
        } else {
          const error = await response.json().catch(() => ({}))
          return {
            success: false,
            message: error.error?.message || `连接失败: ${response.status}`,
          }
        }
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : '网络错误',
        }
      }
    }),
})

export type LlmConfigsRouter = typeof llmConfigsRouter

