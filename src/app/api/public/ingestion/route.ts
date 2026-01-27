/**
 * Langfuse 兼容 Ingestion API
 * POST /api/public/ingestion
 * 
 * 接收 Langfuse 格式的数据（Dify 通过 Langfuse 集成发送）
 */

import { NextResponse } from 'next/server'
import { insertTraces, type TraceData } from '@/lib/clickhouse'
import prisma from '@/lib/prisma'

// Langfuse Event Types
interface LangfuseBody {
  name?: string
  model?: string
  input?: unknown
  output?: unknown
  metadata?: Record<string, unknown>
  usage?: {
    totalTokens?: number
    promptTokens?: number
    completionTokens?: number
  }
  startTime?: string
  endTime?: string
  level?: string
  statusMessage?: string
}

interface LangfuseEvent {
  id: string
  type: string
  timestamp: string
  body?: LangfuseBody
}

/**
 * 验证 Basic Auth 并获取 Project
 */
async function validateAuth(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return null
  }

  try {
    const base64Credentials = authHeader.split(' ')[1]
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii')
    const [publicKey, secretKey] = credentials.split(':')

    if (!publicKey || !secretKey) {
      return null
    }

    // 从数据库查找匹配的项目
    // 约定：publicKey 格式为 "pk-{projectId}" 或直接是 projectId
    // secretKey 格式为 "sk-{...}"
    
    // 尝试从 publicKey 中提取 projectId
    let projectId: string | null = null
    
    if (publicKey.startsWith('pk-')) {
      // 新格式：pk-simplefuse 表示使用默认项目
      // 从数据库查找第一个项目
      const project = await prisma.project.findFirst({
        orderBy: { createdAt: 'asc' },
      })
      projectId = project?.id || null
    } else {
      // 尝试直接作为 projectId 使用
      const project = await prisma.project.findUnique({
        where: { id: publicKey },
      })
      projectId = project?.id || null
    }

    if (!projectId) {
      // 如果仍然没找到，创建或使用默认项目
      const defaultProject = await prisma.project.findFirst()
      if (defaultProject) {
        projectId = defaultProject.id
      } else {
        console.warn('[Ingestion] No project found, cannot proceed')
        return null
      }
    }

    console.log(`[Ingestion] Auth validated, projectId: ${projectId}`)
    return { projectId, publicKey }
  } catch (error) {
    console.error('[Ingestion] Auth validation error:', error)
    return null
  }
}

/**
 * 计算延迟（毫秒）
 */
function calculateLatencyMs(startTime?: string, endTime?: string): number | undefined {
  if (!startTime || !endTime) return undefined
  try {
    const start = new Date(startTime).getTime()
    const end = new Date(endTime).getTime()
    return end - start
  } catch {
    return undefined
  }
}

export async function POST(request: Request) {
  try {
    // 1. Auth
    const auth = await validateAuth(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse Body
    const body = await request.json()
    const { batch } = body

    if (!batch || !Array.isArray(batch)) {
      return NextResponse.json({ error: 'Invalid batch format' }, { status: 400 })
    }

    console.log(`[Ingestion] Received ${batch.length} events for project ${auth.projectId}`)

    const successes: { id: string; status: number }[] = []
    const tracesToInsert: TraceData[] = []

    // 3. Process Events
    for (const event of batch as LangfuseEvent[]) {
      try {
        // 处理 trace-create 和 generation-create 事件
        if (event.type === 'trace-create' || event.type === 'generation-create') {
          const eventBody = event.body || {}
          
          // 计算总 tokens
          let totalTokens: number | undefined
          if (eventBody.usage) {
            totalTokens = eventBody.usage.totalTokens || 
              ((eventBody.usage.promptTokens || 0) + (eventBody.usage.completionTokens || 0)) || 
              undefined
          }
          
          // 构建 metadata
          const metadata: Record<string, string> = {}
          if (eventBody.metadata) {
            for (const [key, value] of Object.entries(eventBody.metadata)) {
              metadata[key] = typeof value === 'string' ? value : JSON.stringify(value)
            }
          }
          if (eventBody.model) metadata.model = eventBody.model
          if (eventBody.level) metadata.level = eventBody.level
          if (eventBody.statusMessage) metadata.statusMessage = eventBody.statusMessage

          const traceData: TraceData = {
            id: event.id,
            projectId: auth.projectId,
            name: eventBody.name || eventBody.model || event.type,
            timestamp: event.timestamp || new Date().toISOString(),
            input: eventBody.input ? JSON.stringify(eventBody.input) : undefined,
            output: eventBody.output ? JSON.stringify(eventBody.output) : undefined,
            metadata,
            tags: [event.type],
            totalTokens,
            latencyMs: calculateLatencyMs(eventBody.startTime, eventBody.endTime),
            status: 'success',
          }
          tracesToInsert.push(traceData)
        }

        successes.push({ id: event.id, status: 201 })
      } catch (e) {
        console.error('[Ingestion] Error processing event:', e)
        successes.push({ id: event.id, status: 500 })
      }
    }

    // 4. Batch Insert
    if (tracesToInsert.length > 0) {
      await insertTraces(tracesToInsert)
      console.log(`[Ingestion] Inserted ${tracesToInsert.length} traces`)
    }

    return NextResponse.json({ successes }, { status: 200 })
  } catch (error) {
    console.error('[Ingestion] API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// 支持 OPTIONS 请求（CORS）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
