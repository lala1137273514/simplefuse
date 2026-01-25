/**
 * Dify Connections tRPC Router
 * Dify 连接管理 API
 * 
 * Task 6.1: Dify 连接 CRUD
 * Task 6.2: Webhook 集成
 */

import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import prisma from '@/lib/prisma'
import { TRPCError } from '@trpc/server'
import { 
  testDifyConnection, 
  fetchDifyWorkflows, 
  generateWebhookUrl, 
  generateWebhookSecret 
} from '@/lib/dify'

// 简单的 API Key 加密 (TODO: 使用 AES 加密)
function encryptApiKey(apiKey: string): string {
  return Buffer.from(apiKey).toString('base64')
}

function decryptApiKey(encrypted: string): string {
  return Buffer.from(encrypted, 'base64').toString('utf-8')
}

// 列表查询输入
const listInputSchema = z.object({
  projectId: z.string().min(1),
})

// 创建连接输入
const createInputSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(100),
  difyUrl: z.string().url(),
  apiKey: z.string().min(1),
})

export const difyConnectionsRouter = router({
  /**
   * 获取 Dify 连接列表
   */
  list: publicProcedure
    .input(listInputSchema)
    .query(async ({ input }) => {
      const [connections, total] = await Promise.all([
        prisma.difyConnection.findMany({
          where: { projectId: input.projectId },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.difyConnection.count({ where: { projectId: input.projectId } }),
      ])

      return {
        connections: connections.map(conn => ({
          id: conn.id,
          name: conn.name,
          apiEndpoint: conn.difyUrl,
          isActive: conn.isActive,
          lastSyncAt: conn.lastSyncAt?.toISOString() || null,
          webhookUrl: generateWebhookUrl(conn.id),
          webhookSecret: conn.webhookSecret || '',
          workflows: (conn.workflows as any) || [],
          createdAt: conn.createdAt.toISOString(),
        })),
        total,
      }
    }),

  /**
   * 创建 Dify 连接
   */
  create: publicProcedure
    .input(createInputSchema)
    .mutation(async ({ input }) => {
      const webhookSecret = generateWebhookSecret()
      
      const connection = await prisma.difyConnection.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          difyUrl: input.difyUrl,
          apiKeyEncrypted: encryptApiKey(input.apiKey),
          webhookSecret,
          isActive: true,
        },
      })

      return {
        id: connection.id,
        name: connection.name,
        apiEndpoint: connection.difyUrl,
        webhookUrl: generateWebhookUrl(connection.id),
        webhookSecret,
        createdAt: connection.createdAt.toISOString(),
      }
    }),

  /**
   * 测试 Dify 连接
   */
  testConnection: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const connection = await prisma.difyConnection.findUnique({
        where: { id: input.id },
      })

      if (!connection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '连接不存在',
        })
      }

      const apiKey = connection.apiKeyEncrypted ? decryptApiKey(connection.apiKeyEncrypted) : ''
      const result = await testDifyConnection(connection.difyUrl, apiKey)

      return result
    }),

  /**
   * 同步 Dify 工作流列表
   */
  syncWorkflows: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const connection = await prisma.difyConnection.findUnique({
        where: { id: input.id },
      })

      if (!connection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '连接不存在',
        })
      }

      const apiKey = connection.apiKeyEncrypted ? decryptApiKey(connection.apiKeyEncrypted) : ''
      const workflows = await fetchDifyWorkflows(connection.difyUrl, apiKey)

      // 更新最后同步时间
      await prisma.difyConnection.update({
        where: { id: input.id },
        data: { lastSyncAt: new Date() },
      })

      return { workflows }
    }),

  /**
   * 重新生成 Webhook Secret
   */
  regenerateWebhookSecret: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const connection = await prisma.difyConnection.findUnique({
        where: { id: input.id },
      })

      if (!connection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '连接不存在',
        })
      }

      const newSecret = generateWebhookSecret()
      
      await prisma.difyConnection.update({
        where: { id: input.id },
        data: { webhookSecret: newSecret },
      })

      return { webhookSecret: newSecret }
    }),

  /**
   * 删除 Dify 连接
   */
  delete: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const connection = await prisma.difyConnection.findUnique({
        where: { id: input.id },
      })

      if (!connection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '连接不存在',
        })
      }

      await prisma.difyConnection.delete({ where: { id: input.id } })

      return { success: true }
    }),

  /**
   * 更新连接状态
   */
  updateStatus: publicProcedure
    .input(z.object({
      id: z.string().min(1),
      isActive: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const connection = await prisma.difyConnection.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      })

      return {
        id: connection.id,
        isActive: connection.isActive,
      }
    }),
})

export type DifyConnectionsRouter = typeof difyConnectionsRouter
