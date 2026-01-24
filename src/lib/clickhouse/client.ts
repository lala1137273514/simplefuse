/**
 * ClickHouse 客户端
 * 用于连接和操作 ClickHouse 分析数据库
 */

import { createClient, ClickHouseClient } from '@clickhouse/client'

// 单例模式
let client: ClickHouseClient | null = null

export function getClickHouseClient(): ClickHouseClient {
  if (!client) {
    client = createClient({
      url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
      database: process.env.CLICKHOUSE_DATABASE || 'simplefuse',
      username: process.env.CLICKHOUSE_USER || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || '',
    })
  }
  return client
}

/**
 * 将 ISO 时间戳转换为 ClickHouse DateTime64 格式
 */
function toClickHouseDateTime(isoString: string): string {
  // ClickHouse DateTime64 格式: '2024-01-24 12:00:00.000'
  const date = new Date(isoString)
  return date.toISOString().replace('T', ' ').replace('Z', '')
}

/**
 * 插入 Trace 数据到 ClickHouse
 */
export async function insertTrace(trace: TraceData): Promise<void> {
  const ch = getClickHouseClient()
  const now = toClickHouseDateTime(new Date().toISOString())
  const timestamp = toClickHouseDateTime(trace.timestamp)
  
  await ch.insert({
    table: 'traces',
    values: [{
      id: trace.id,
      project_id: trace.projectId,
      dify_connection_id: trace.difyConnectionId || '',
      workflow_name: trace.workflowName || '',
      name: trace.name || '',
      timestamp: timestamp,
      user_id: trace.userId || null,
      session_id: trace.sessionId || null,
      input: trace.input || '',
      output: trace.output || '',
      metadata: trace.metadata || {},
      tags: trace.tags || [],
      total_tokens: trace.totalTokens || null,
      latency_ms: trace.latencyMs || null,
      status: trace.status || 'success',
      created_at: now,
      event_ts: now,
      is_deleted: 0,
    }],
    format: 'JSONEachRow',
  })
}

/**
 * 批量插入 Traces
 */
export async function insertTraces(traces: TraceData[]): Promise<void> {
  const ch = getClickHouseClient()
  const now = toClickHouseDateTime(new Date().toISOString())
  
  const values = traces.map(trace => ({
    id: trace.id,
    project_id: trace.projectId,
    dify_connection_id: trace.difyConnectionId || '',
    workflow_name: trace.workflowName || '',
    name: trace.name || '',
    timestamp: toClickHouseDateTime(trace.timestamp),
    user_id: trace.userId || null,
    session_id: trace.sessionId || null,
    input: trace.input || '',
    output: trace.output || '',
    metadata: trace.metadata || {},
    tags: trace.tags || [],
    total_tokens: trace.totalTokens || null,
    latency_ms: trace.latencyMs || null,
    status: trace.status || 'success',
    created_at: now,
    event_ts: now,
    is_deleted: 0,
  }))
  
  await ch.insert({
    table: 'traces',
    values,
    format: 'JSONEachRow',
  })
}

/**
 * Trace 数据类型
 */
export interface TraceData {
  id: string
  projectId: string
  difyConnectionId?: string
  workflowName?: string
  name?: string
  timestamp: string
  userId?: string
  sessionId?: string
  input?: string
  output?: string
  metadata?: Record<string, string>
  tags?: string[]
  totalTokens?: number
  latencyMs?: number
  status?: string
}
