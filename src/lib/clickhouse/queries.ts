/**
 * ClickHouse 查询功能
 * 用于查询 Trace 数据
 */

import { getClickHouseClient } from './client'

export interface TraceListParams {
  projectId: string
  limit?: number
  offset?: number
  status?: string
  name?: string
  startTime?: string
  endTime?: string
  orderBy?: 'timestamp' | 'latency_ms' | 'total_tokens'
  orderDir?: 'asc' | 'desc'
}

export interface TraceRecord {
  id: string
  project_id: string
  dify_connection_id: string
  workflow_name: string
  name: string
  timestamp: string
  user_id: string | null
  session_id: string | null
  input: string
  output: string
  metadata: Record<string, string>
  tags: string[]
  total_tokens: number | null
  latency_ms: number | null
  status: string
  created_at: string
}

/**
 * 查询 Trace 列表
 */
export async function queryTraces(params: TraceListParams): Promise<{
  traces: TraceRecord[]
  total: number
}> {
  const ch = getClickHouseClient()
  const {
    projectId,
    limit = 20,
    offset = 0,
    status,
    name,
    startTime,
    endTime,
    orderBy = 'timestamp',
    orderDir = 'desc',
  } = params

  // 构建 WHERE 条件
  const conditions: string[] = ['is_deleted = 0']
  const values: Record<string, unknown> = {}

  if (projectId) {
    conditions.push('project_id = {projectId:String}')
    values.projectId = projectId
  }

  if (status) {
    conditions.push('status = {status:String}')
    values.status = status
  }

  if (name) {
    conditions.push('name LIKE {name:String}')
    values.name = `%${name}%`
  }

  if (startTime) {
    conditions.push('timestamp >= {startTime:DateTime64(3)}')
    values.startTime = startTime
  }

  if (endTime) {
    conditions.push('timestamp <= {endTime:DateTime64(3)}')
    values.endTime = endTime
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const orderClause = `ORDER BY ${orderBy} ${orderDir.toUpperCase()}`

  // 查询数据
  const query = `
    SELECT *
    FROM traces
    ${whereClause}
    ${orderClause}
    LIMIT {limit:UInt32}
    OFFSET {offset:UInt32}
  `

  const result = await ch.query({
    query,
    query_params: { ...values, limit, offset },
    format: 'JSONEachRow',
  })

  const traces = await result.json<TraceRecord[]>()

  // 查询总数
  const countQuery = `
    SELECT count() as total
    FROM traces
    ${whereClause}
  `

  const countResult = await ch.query({
    query: countQuery,
    query_params: values,
    format: 'JSONEachRow',
  })

  const countData = await countResult.json<{ total: string }[]>()
  const total = parseInt(countData[0]?.total || '0', 10)

  return { traces, total }
}

/**
 * 根据 ID 查询单个 Trace
 */
export async function queryTraceById(id: string): Promise<TraceRecord | null> {
  const ch = getClickHouseClient()

  const query = `
    SELECT *
    FROM traces
    WHERE id = {id:String} AND is_deleted = 0
    LIMIT 1
  `

  const result = await ch.query({
    query,
    query_params: { id },
    format: 'JSONEachRow',
  })

  const traces = await result.json<TraceRecord[]>()
  return traces[0] || null
}
