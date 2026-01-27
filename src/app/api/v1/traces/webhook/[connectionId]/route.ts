/**
 * Webhook 接收 API
 * POST /api/v1/traces/webhook/[connectionId]
 * 
 * 接收来自 Dify 的 Webhook 推送，转换为 Trace 格式并存储
 */

import { NextResponse } from 'next/server'
import { insertTrace, type TraceData } from '@/lib/clickhouse'
import prisma from '@/lib/prisma'
import crypto from 'crypto'

// Dify Webhook 数据格式 (详细版)
interface DifyWebhookData {
  event: string
  workflow_run_id?: string
  task_id?: string
  conversation_id?: string
  message_id?: string
  data?: {
    id?: string
    workflow_id?: string
    status?: string
    inputs?: Record<string, unknown>
    outputs?: Record<string, unknown>
    elapsed_time?: number
    total_tokens?: number
    total_steps?: number
    created_at?: string | number
    finished_at?: string | number
    // 工作流步骤信息
    steps?: Array<{
      node_id: string
      node_type: string
      title: string
      status: string
      elapsed_time?: number
      inputs?: Record<string, unknown>
      outputs?: Record<string, unknown>
    }>
  }
  // Dify 发送的顶层字段 (有时数据直接在顶层)
  inputs?: Record<string, unknown>
  outputs?: Record<string, unknown>
  workflow_id?: string
  status?: string
  elapsed_time?: number
  total_tokens?: number
  created_at?: string | number
}

/**
 * 验证 Webhook 签名
 */
function verifySignature(
  payload: string,
  signature: string | null,
  secret: string | null
): boolean {
  if (!secret) return true
  if (!signature) return false
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  
  return signature === expectedSignature || signature === `sha256=${expectedSignature}`
}

/**
 * 解析时间戳
 */
function parseTimestamp(value: string | number | undefined): string {
  if (!value) return new Date().toISOString()
  if (typeof value === 'number') {
    // 可能是秒级或毫秒级时间戳
    const ts = value > 1e12 ? value : value * 1000
    return new Date(ts).toISOString()
  }
  return value
}

/**
 * 将 Dify Webhook 数据转换为 Trace 格式
 */
function convertDifyToTrace(
  projectId: string,
  connectionId: string,
  connectionName: string,
  webhookData: DifyWebhookData
): TraceData {
  const data = webhookData.data || {}
  
  // 提取字段，优先使用 data 内部的值，fallback 到顶层
  const inputs = data.inputs || webhookData.inputs
  const outputs = data.outputs || webhookData.outputs
  const workflowId = data.workflow_id || webhookData.workflow_id
  const status = data.status || webhookData.status
  const elapsedTime = data.elapsed_time || webhookData.elapsed_time
  const totalTokens = data.total_tokens || webhookData.total_tokens
  const createdAt = data.created_at || webhookData.created_at
  
  // 生成 trace ID
  const traceId = data.id || 
                  webhookData.workflow_run_id || 
                  webhookData.task_id ||
                  webhookData.message_id ||
                  `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  // 构建完整的 metadata
  const metadata: Record<string, string> = {
    event: webhookData.event || '',
    status: status || '',
    dify_connection_name: connectionName,
  }
  
  if (workflowId) metadata.workflow_id = workflowId
  if (webhookData.conversation_id) metadata.conversation_id = webhookData.conversation_id
  if (webhookData.message_id) metadata.message_id = webhookData.message_id
  if (data.total_steps) metadata.total_steps = String(data.total_steps)
  
  // 如果有 steps 信息，也加入 metadata
  if (data.steps && Array.isArray(data.steps)) {
    metadata.steps_count = String(data.steps.length)
    metadata.steps = JSON.stringify(data.steps.map(s => ({
      node_type: s.node_type,
      title: s.title,
      status: s.status,
      elapsed_time: s.elapsed_time,
    })))
  }
  
  return {
    id: traceId,
    projectId,
    difyConnectionId: connectionId,
    workflowName: connectionName, // 使用连接名称作为工作流名
    name: webhookData.event || 'dify-webhook',
    timestamp: parseTimestamp(createdAt),
    input: inputs ? JSON.stringify(inputs) : '',
    output: outputs ? JSON.stringify(outputs) : '',
    metadata,
    tags: [webhookData.event || 'unknown', status || 'unknown'].filter(Boolean),
    totalTokens: totalTokens ? Number(totalTokens) : undefined,
    latencyMs: elapsedTime ? Math.round(Number(elapsedTime) * 1000) : undefined,
    status: status === 'succeeded' || status === 'success' ? 'success' : status || 'unknown',
  }
}

interface RouteContext {
  params: Promise<{ connectionId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { connectionId } = await context.params
    
    // 1. 从数据库获取连接信息
    const connection = await prisma.difyConnection.findUnique({
      where: { id: connectionId },
    })
    
    if (!connection) {
      console.error(`[Webhook] Connection not found: ${connectionId}`)
      return NextResponse.json(
        { error: '连接不存在' },
        { status: 404 }
      )
    }
    
    if (!connection.isActive) {
      console.warn(`[Webhook] Connection is inactive: ${connectionId}`)
      return NextResponse.json(
        { error: '连接已禁用' },
        { status: 403 }
      )
    }

    // 2. 读取请求体
    let rawBody: string
    let webhookData: DifyWebhookData
    
    try {
      rawBody = await request.text()
      webhookData = JSON.parse(rawBody)
      
      // 调试日志：打印收到的原始数据
      console.log(`[Webhook] Received data from ${connection.name}:`, rawBody.substring(0, 500))
    } catch {
      return NextResponse.json(
        { error: '无效的 JSON 格式' },
        { status: 400 }
      )
    }

    // 3. 验证签名
    const signature = request.headers.get('X-Dify-Signature')
    if (!verifySignature(rawBody, signature, connection.webhookSecret)) {
      return NextResponse.json(
        { error: '签名验证失败' },
        { status: 401 }
      )
    }

    // 4. 转换数据格式
    const trace = convertDifyToTrace(
      connection.projectId,
      connectionId,
      connection.name,
      webhookData
    )

    // 5. 写入数据库
    await insertTrace(trace)
    
    console.log(`[Webhook] Trace saved: ${trace.id}, project: ${connection.projectId}, workflow: ${trace.workflowName}`)

    // 6. 返回成功
    return NextResponse.json({
      success: true,
      traceId: trace.id,
      message: '成功接收 Webhook',
    })
  } catch (error) {
    console.error('[Webhook] API 错误:', error)
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
