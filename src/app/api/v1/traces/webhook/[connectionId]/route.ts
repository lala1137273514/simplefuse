/**
 * Webhook 接收 API
 * POST /api/v1/traces/webhook/[connectionId]
 * 
 * 接收来自 Dify 的 Webhook 推送，转换为 Trace 格式并存储
 */

import { NextResponse } from 'next/server'
import { insertTrace, type TraceData } from '@/lib/clickhouse'
import crypto from 'crypto'

// Dify Webhook 数据格式
interface DifyWebhookData {
  event: string
  workflow_run_id: string
  data: {
    id: string
    workflow_id?: string
    status?: string
    inputs?: Record<string, unknown>
    outputs?: Record<string, unknown>
    elapsed_time?: number
    total_tokens?: number
    created_at?: string
    finished_at?: string
  }
}

/**
 * 验证 Webhook 签名
 * Dify 使用 HMAC-SHA256 签名
 */
function verifySignature(
  payload: string,
  signature: string | null,
  secret: string | null
): boolean {
  if (!secret) {
    // 如果没有配置 secret，跳过验证
    return true
  }
  
  if (!signature) {
    return false
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  
  return signature === expectedSignature || signature === `sha256=${expectedSignature}`
}

/**
 * 将 Dify Webhook 数据转换为 Trace 格式
 */
function convertDifyToTrace(
  connectionId: string,
  webhookData: DifyWebhookData
): TraceData {
  const data = webhookData.data || {}
  
  return {
    id: data.id || webhookData.workflow_run_id || `trace-${Date.now()}`,
    projectId: connectionId.split('-')[0] || 'default',
    difyConnectionId: connectionId,
    workflowName: data.workflow_id || '',
    name: webhookData.event || 'unknown',
    timestamp: data.created_at || new Date().toISOString(),
    input: data.inputs ? JSON.stringify(data.inputs) : '',
    output: data.outputs ? JSON.stringify(data.outputs) : '',
    metadata: {
      event: webhookData.event || '',
      status: data.status || '',
      workflow_id: data.workflow_id || '',
    },
    tags: [webhookData.event || 'unknown', data.status || 'unknown'],
    totalTokens: data.total_tokens,
    latencyMs: data.elapsed_time ? Math.round(data.elapsed_time * 1000) : undefined,
    status: data.status === 'succeeded' ? 'success' : data.status || 'unknown',
  }
}

interface RouteContext {
  params: Promise<{ connectionId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { connectionId } = await context.params

    // 1. 读取请求体
    let rawBody: string
    let webhookData: DifyWebhookData
    
    try {
      rawBody = await request.text()
      webhookData = JSON.parse(rawBody)
    } catch {
      return NextResponse.json(
        { error: '无效的 JSON 格式' },
        { status: 400 }
      )
    }

    // 2. 验证签名（如果配置了）
    // TODO: 从数据库获取连接配置和 webhook secret
    const signature = request.headers.get('X-Dify-Signature')
    const webhookSecret = null // 暂时不验证签名
    
    if (!verifySignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json(
        { error: '签名验证失败' },
        { status: 401 }
      )
    }

    // 3. 转换数据格式
    const trace = convertDifyToTrace(connectionId, webhookData)

    // 4. 写入 ClickHouse
    await insertTrace(trace)

    // 5. 返回成功
    return NextResponse.json({
      success: true,
      traceId: trace.id,
      message: '成功接收 Webhook',
    })
  } catch (error) {
    console.error('Webhook API 错误:', error)
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
      'Access-Control-Allow-Headers': 'Content-Type, X-Dify-Signature',
    },
  })
}
