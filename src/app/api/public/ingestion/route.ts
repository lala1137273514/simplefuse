/**
 * Langfuse 兼容 Ingestion API
 * POST /api/public/ingestion
 * 
 * 接收 Langfuse 格式的数据（Dify 通过 Langfuse 集成发送）
 * 将多个事件（trace-create + generation-create + span-create）合并为单个 Trace
 */

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// ============================================
// 类型定义
// ============================================

interface LangfuseUsage {
  totalTokens?: number
  promptTokens?: number
  completionTokens?: number
  input?: number
  output?: number
  total?: number
}

interface LangfuseBody {
  id?: string
  traceId?: string
  name?: string
  model?: string
  input?: unknown
  output?: unknown
  metadata?: Record<string, unknown>
  usage?: LangfuseUsage
  startTime?: string
  endTime?: string
  level?: string
  statusMessage?: string
  parentObservationId?: string
}

interface LangfuseEvent {
  id: string
  type: string
  timestamp: string
  body?: LangfuseBody
}

interface Observation {
  id: string
  type: string  // llm | span | generation | retrieval
  name: string
  model?: string
  startTime?: string
  endTime?: string
  latencyMs?: number
  tokens?: {
    prompt?: number
    completion?: number
    total?: number
  }
  input?: unknown
  output?: unknown
  status: string
}

// ============================================
// 辅助函数
// ============================================

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

    // 从数据库查找项目
    let projectId: string | null = null
    
    if (publicKey.startsWith('pk-')) {
      const project = await prisma.project.findFirst({
        orderBy: { createdAt: 'asc' },
      })
      projectId = project?.id || null
    } else {
      const project = await prisma.project.findUnique({
        where: { id: publicKey },
      })
      projectId = project?.id || null
    }

    if (!projectId) {
      const defaultProject = await prisma.project.findFirst()
      projectId = defaultProject?.id || null
    }

    if (!projectId) {
      console.warn('[Ingestion] No project found')
      return null
    }

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

/**
 * 提取 tokens 信息
 */
function extractTokens(usage?: LangfuseUsage): { prompt?: number; completion?: number; total?: number } | undefined {
  if (!usage) return undefined
  
  const prompt = usage.promptTokens || usage.input || 0
  const completion = usage.completionTokens || usage.output || 0
  const total = usage.totalTokens || usage.total || (prompt + completion)
  
  if (total === 0) return undefined
  
  return { prompt, completion, total }
}

/**
 * 将 Langfuse 事件转换为 Observation
 */
function eventToObservation(event: LangfuseEvent): Observation | null {
  const body = event.body || {}
  
  // 确定观察类型
  let type = 'span'
  if (event.type === 'generation-create' || event.type === 'generation-update') {
    type = body.model ? 'llm' : 'generation'
  } else if (event.type === 'span-create' || event.type === 'span-update') {
    type = 'span'
  }
  
  const tokens = extractTokens(body.usage)
  const latencyMs = calculateLatencyMs(body.startTime, body.endTime)
  
  return {
    id: event.id,
    type,
    name: body.name || body.model || event.type,
    model: body.model,
    startTime: body.startTime,
    endTime: body.endTime,
    latencyMs,
    tokens,
    input: body.input,
    output: body.output,
    status: body.level === 'ERROR' ? 'error' : 'success',
  }
}

// ============================================
// 主处理函数
// ============================================

export async function POST(request: Request) {
  try {
    // 1. Auth
    const auth = await validateAuth(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse Body
    const rawBody = await request.json()
    const { batch } = rawBody

    if (!batch || !Array.isArray(batch)) {
      return NextResponse.json({ error: 'Invalid batch format' }, { status: 400 })
    }

    console.log(`[Ingestion] Received ${batch.length} events for project ${auth.projectId}`)

    const successes: { id: string; status: number }[] = []
    
    // 3. 按 traceId 分组事件
    const traceEvents = new Map<string, {
      traceEvent: LangfuseEvent | null
      observations: LangfuseEvent[]
    }>()

    for (const event of batch as LangfuseEvent[]) {
      const body = event.body || {}
      
      // 确定 traceId
      let traceId: string
      if (event.type === 'trace-create' || event.type === 'trace-update') {
        traceId = event.id
      } else {
        traceId = body.traceId || event.id
      }
      
      // 初始化分组
      if (!traceEvents.has(traceId)) {
        traceEvents.set(traceId, { traceEvent: null, observations: [] })
      }
      
      const group = traceEvents.get(traceId)!
      
      if (event.type === 'trace-create' || event.type === 'trace-update') {
        group.traceEvent = event
      } else if (event.type.includes('generation') || event.type.includes('span')) {
        group.observations.push(event)
      }
      
      successes.push({ id: event.id, status: 201 })
    }

    // 4. 处理每个 trace 分组
    for (const [traceId, group] of traceEvents) {
      try {
        const { traceEvent, observations } = group
        
        // 构建 observations 数组
        const observationsData: Observation[] = observations
          .map(eventToObservation)
          .filter((o): o is Observation => o !== null)
        
        // 计算聚合数据
        let totalTokens = 0
        let totalLatency = 0
        for (const obs of observationsData) {
          if (obs.tokens?.total) totalTokens += obs.tokens.total
          if (obs.latencyMs) totalLatency += obs.latencyMs
        }
        
        // 获取 trace 主体数据
        const traceBody = traceEvent?.body || {}
        const timestamp = traceEvent?.timestamp || observations[0]?.timestamp || new Date().toISOString()
        
        // 从 observations 提取输入输出 (仅作为备选)
        let extractedInput: string | undefined
        let extractedOutput: string | undefined
        
        // 只有当 traceBody 中也没提供 input 时，才尝试提取
        if (!traceBody.input) {
            for (const obs of observationsData) {
            if (!extractedInput && obs.input) {
                extractedInput = typeof obs.input === 'string' ? obs.input : JSON.stringify(obs.input)
            }
            }
        }
        
        // 只有当 traceBody 中也没提供 output 时，才尝试提取
        if (!traceBody.output) {
            // 反向遍历找最后一个有输出的节点
            for (let i = observationsData.length - 1; i >= 0; i--) {
            const obs = observationsData[i]
            if (obs.output) {
                extractedOutput = typeof obs.output === 'string' ? obs.output : JSON.stringify(obs.output)
                break
            }
            }
        }
        
        // 优先使用 traceEvent 中的 input/output，其次使用提取的
        const finalInput = traceBody.input 
            ? (typeof traceBody.input === 'string' ? traceBody.input : JSON.stringify(traceBody.input))
            : extractedInput

        const finalOutput = traceBody.output
            ? (typeof traceBody.output === 'string' ? traceBody.output : JSON.stringify(traceBody.output))
            : extractedOutput
        
        // 构建 metadata
        const metadata: Record<string, string> = {}
        if (traceBody.metadata) {
          for (const [key, value] of Object.entries(traceBody.metadata)) {
            metadata[key] = typeof value === 'string' ? value : JSON.stringify(value)
          }
        }
        
        // Upsert trace (创建或更新)
        const existingTrace = await prisma.trace.findUnique({
          where: { id: traceId },
        })
        
        if (existingTrace) {
          // 更新现有 trace，合并 observations
          const existingObs = (existingTrace.observations as unknown as Observation[] | null) || []
          const mergedObs = [...existingObs]
          
          // 合并新的 observations（避免重复）
          for (const newObs of observationsData) {
            if (!mergedObs.find(o => o.id === newObs.id)) {
              mergedObs.push(newObs)
            }
          }
          
          // 重新计算总 tokens 和延迟
          let updatedTotalTokens = 0
          let updatedTotalLatency = 0
          for (const obs of mergedObs) {
            if (obs.tokens?.total) updatedTotalTokens += obs.tokens.total
            if (obs.latencyMs) updatedTotalLatency += obs.latencyMs
          }
          
          await prisma.trace.update({
            where: { id: traceId },
            data: {
              observations: mergedObs as unknown as Prisma.JsonArray,
              totalTokens: updatedTotalTokens || existingTrace.totalTokens,
              latencyMs: updatedTotalLatency || existingTrace.latencyMs,
              // 如果提供了新的 finalInput/Output 则更新，否则保持原样 (或使用提取的)
              // 注意：如果 traceEvent 只是部分更新且未带 input/output，这里 finalInput 可能是 undefined，
              // 我们应该只在 finalInput 有值时更新
              input: finalInput ?? existingTrace.input,
              output: finalOutput ?? existingTrace.output,
              updatedAt: new Date(),
            },
          })
          
          console.log(`[Ingestion] Updated trace ${traceId} with ${mergedObs.length} observations`)
        } else {
          // 创建新 trace
          await prisma.trace.create({
            data: {
              id: traceId,
              projectId: auth.projectId,
              name: traceBody.name || 'Trace',
              timestamp: new Date(timestamp),
              input: finalInput,
              output: finalOutput,
              metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
              tags: ['langfuse'],
              totalTokens: totalTokens || undefined,
              latencyMs: totalLatency || undefined,
              status: 'success',
              observations: observationsData.length > 0 ? (observationsData as unknown as Prisma.JsonArray) : undefined,
            },
          })
          
          console.log(`[Ingestion] Created trace ${traceId} with ${observationsData.length} observations`)
        }
      } catch (error) {
        console.error(`[Ingestion] Error processing trace ${traceId}:`, error)
      }
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
