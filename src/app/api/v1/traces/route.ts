/**
 * Trace 接收 API
 * POST /api/v1/traces
 * 
 * 接收来自 Dify 或其他来源的 Trace 数据
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { insertTrace, insertTraces, type TraceData } from '@/lib/clickhouse'

// Trace 数据验证 Schema
const TraceSchema = z.object({
  id: z.string().min(1, 'Trace ID 不能为空'),
  projectId: z.string().min(1, 'Project ID 不能为空'),
  name: z.string().optional(),
  timestamp: z.string().optional(),
  input: z.string().optional(),
  output: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
  tags: z.array(z.string()).optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  difyConnectionId: z.string().optional(),
  workflowName: z.string().optional(),
  totalTokens: z.number().optional(),
  latencyMs: z.number().optional(),
  status: z.string().optional(),
})

// 批量 Trace Schema
const BatchTraceSchema = z.object({
  traces: z.array(TraceSchema),
})

// 请求体可以是单个 Trace 或批量
const RequestSchema = z.union([
  TraceSchema,
  BatchTraceSchema,
])

/**
 * 验证 API Key
 * 在生产环境中，这应该查询数据库验证
 */
async function validateApiKey(apiKey: string | null): Promise<{ valid: boolean; projectId?: string }> {
  if (!apiKey) {
    return { valid: false }
  }
  
  // TODO: 从数据库查询验证 API Key
  // 临时：只要有 API Key 就认为有效（测试用）
  if (apiKey === 'test-api-key') {
    return { valid: true, projectId: 'project-abc' }
  }
  
  // 生产环境：查询数据库
  // const project = await prisma.project.findUnique({ where: { apiKey } })
  // if (project) return { valid: true, projectId: project.id }
  
  return { valid: false }
}

export async function POST(request: Request) {
  try {
    // 1. 验证 API Key
    const apiKey = request.headers.get('X-API-Key')
    const authResult = await validateApiKey(apiKey)
    
    if (!authResult.valid) {
      return NextResponse.json(
        { error: '未授权访问，请提供有效的 API Key' },
        { status: 401 }
      )
    }

    // 2. 解析请求体
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: '无效的 JSON 格式' },
        { status: 400 }
      )
    }

    // 3. 验证数据
    const parseResult = RequestSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          error: '数据验证失败',
          details: parseResult.error.issues,
        },
        { status: 400 }
      )
    }

    const data = parseResult.data

    // 4. 处理单个或批量 Trace
    if ('traces' in data) {
      // 批量插入
      const traces = data.traces as TraceData[]
      await insertTraces(traces)
      
      return NextResponse.json(
        { 
          success: true,
          count: traces.length,
          message: `成功接收 ${traces.length} 条 Traces`,
        },
        { status: 201 }
      )
    } else {
      // 单个插入
      const trace = data as TraceData
      await insertTrace(trace)
      
      return NextResponse.json(
        { 
          success: true,
          traceId: trace.id,
          message: '成功接收 Trace',
        },
        { status: 201 }
      )
    }
  } catch (error) {
    console.error('Trace API 错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

// 支持 OPTIONS 请求（CORS）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    },
  })
}
