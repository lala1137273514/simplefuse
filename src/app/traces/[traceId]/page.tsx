'use client'

import { use, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  Copy,
  Loader2,
  AlertCircle,
  Bot,
  GitBranch,
  Play,
  Square,
  Database,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { trpc } from '@/lib/trpc-client'

// Observation 类型定义
interface Observation {
  id: string
  type: string
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

function getStatusBadge(status: string) {
  switch (status) {
    case 'success':
    case 'succeeded':
      return (
        <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
          <CheckCircle2 className="h-3 w-3" />
          成功
        </Badge>
      )
    case 'error':
    case 'failed':
      return (
        <Badge variant="outline" className="gap-1 text-red-600 border-red-200 bg-red-50">
          <XCircle className="h-3 w-3" />
          错误
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function getObsIcon(type: string) {
  switch (type) {
    case 'llm':
    case 'generation':
      return <Bot className="h-4 w-4 text-purple-500" />
    case 'span':
      return <GitBranch className="h-4 w-4 text-blue-500" />
    case 'retrieval':
      return <Database className="h-4 w-4 text-green-500" />
    default:
      return <Play className="h-4 w-4 text-gray-500" />
  }
}

function formatTime(timestamp: string) {
  try {
    return new Date(timestamp).toLocaleString('zh-CN')
  } catch {
    return timestamp
  }
}

function formatLatency(ms: number | null | undefined) {
  if (!ms) return '-'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`
  const minutes = Math.floor(ms / 60000)
  const seconds = ((ms % 60000) / 1000).toFixed(0)
  return `${minutes}m ${seconds}s`
}

function formatTokens(tokens: number | null | undefined) {
  if (!tokens) return '-'
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`
  return tokens.toString()
}

function formatJson(input: string | null | undefined) {
  if (!input) return '-'
  try {
    const parsed = JSON.parse(input)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return input
  }
}

function formatAnyValue(value: unknown): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return value
    }
  }
  return JSON.stringify(value, null, 2)
}

interface PageProps {
  params: Promise<{ traceId: string }>
}

export default function TraceDetailPage({ params }: PageProps) {
  const { traceId } = use(params)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  
  const { data: trace, isLoading, error } = trpc.traces.getById.useQuery(
    { id: traceId },
    { 
      retry: 1,
      refetchOnWindowFocus: false,
    }
  )

  const handleCopyId = () => {
    navigator.clipboard.writeText(traceId)
  }

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !trace) {
    return (
      <div className="space-y-6">
        <Breadcrumb 
          items={[
            { label: 'Traces', href: '/traces' },
            { label: traceId }
          ]}
          backHref="/traces"
        />
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">
            {error?.message || '未找到 Trace 数据'}
          </p>
          <p className="text-sm text-muted-foreground font-mono">
            ID: {traceId}
          </p>
        </div>
      </div>
    )
  }

  // 解析 observations 并按时间排序
  const rawObservations = (trace.observations as unknown as Observation[] | null) || []
  const observations = [...rawObservations].sort((a, b) => {
    const timeA = a.startTime ? new Date(a.startTime).getTime() : 0
    const timeB = b.startTime ? new Date(b.startTime).getTime() : 0
    return timeA - timeB
  })
  const metadata = trace.metadata as Record<string, string> | null

  // 优先显示 workflowName，其次是 name
  const displayName = trace.workflowName || trace.name || 'Trace'
  const subName = trace.workflowName && trace.name ? trace.name : '工作流执行'

  return (
    <div className="space-y-6">
      {/* 面包屑导航 */}
      <Breadcrumb 
        items={[
          { label: 'Traces', href: '/traces' },
          { label: displayName }
        ]}
        backHref="/traces"
      />

      {/* 标题和元信息 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            {displayName}
            {getStatusBadge(trace.status)}
          </h1>
          <p className="text-muted-foreground mt-1">
            {subName}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleCopyId}>
          <Copy className="h-4 w-4 mr-2" />
          复制 ID
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="glass">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Clock className="h-4 w-4" />
              时间
            </div>
            <p className="text-lg font-medium mt-1">
              {formatTime(trace.timestamp)}
            </p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Zap className="h-4 w-4" />
              总 Tokens
            </div>
            <p className="text-lg font-medium mt-1">
              {formatTokens(trace.totalTokens)}
            </p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-4">
            <div className="text-muted-foreground text-sm">延迟</div>
            <p className="text-lg font-medium mt-1">
              {formatLatency(trace.latencyMs)}
            </p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-4">
            <div className="text-muted-foreground text-sm">节点数</div>
            <p className="text-lg font-medium mt-1">
              {observations.length || '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 详情 Tabs */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">时间线</TabsTrigger>
          <TabsTrigger value="io">输入/输出</TabsTrigger>
          <TabsTrigger value="metadata">元数据</TabsTrigger>
        </TabsList>

        {/* 时间线 Tab */}
        <TabsContent value="timeline">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-lg">执行时间线</CardTitle>
            </CardHeader>
            <CardContent>
              {observations.length > 0 ? (
                <div className="space-y-1">
                  {observations.map((obs, index) => {
                    const nodeId = obs.id || `node-${index}`
                    const isExpanded = expandedNodes.has(nodeId)
                    const hasContent = Boolean(obs.input || obs.output)
                    
                    return (
                      <div key={nodeId} className="border rounded-lg overflow-hidden">
                        {/* 节点头部 - 可点击展开 */}
                        <div 
                          className={`flex items-center justify-between py-3 px-4 hover:bg-muted/50 transition-colors ${hasContent ? 'cursor-pointer' : ''}`}
                          onClick={() => hasContent && toggleNode(nodeId)}
                        >
                          <div className="flex items-center gap-3">
                            {hasContent && (
                              isExpanded 
                                ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                              {getObsIcon(obs.type)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{obs.name}</span>
                                {obs.model && (
                                  <Badge variant="secondary" className="text-xs">
                                    {obs.model}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                                {obs.tokens?.total && (
                                  <span>{formatTokens(obs.tokens.total)} tokens</span>
                                )}
                                {obs.latencyMs && (
                                  <span>{formatLatency(obs.latencyMs)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {obs.latencyMs && (
                              <span className="text-sm text-muted-foreground">
                                {formatLatency(obs.latencyMs)}
                              </span>
                            )}
                            {getStatusBadge(obs.status)}
                          </div>
                        </div>
                        
                        {/* 展开的输入输出内容 */}
                        {isExpanded && hasContent && (
                          <div className="border-t bg-muted/30 p-4 space-y-4">
                            {Boolean(obs.input) && (
                              <div>
                                <h4 className="text-sm font-medium text-muted-foreground mb-2">输入</h4>
                                <pre className="bg-background rounded-lg p-3 text-sm overflow-auto max-h-64 whitespace-pre-wrap font-mono">
                                  {formatAnyValue(obs.input)}
                                </pre>
                              </div>
                            )}
                            {Boolean(obs.output) && (
                              <div>
                                <h4 className="text-sm font-medium text-muted-foreground mb-2">输出</h4>
                                <pre className="bg-background rounded-lg p-3 text-sm overflow-auto max-h-64 whitespace-pre-wrap font-mono">
                                  {formatAnyValue(obs.output)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Square className="h-8 w-8 mb-2" />
                  <p>暂无执行节点数据</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 输入/输出 Tab */}
        <TabsContent value="io">
          <div className="grid grid-cols-2 gap-4">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-lg">输入</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted/50 rounded-lg p-4 text-sm overflow-auto max-h-96 whitespace-pre-wrap">
                  {formatJson(trace.input)}
                </pre>
              </CardContent>
            </Card>
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-lg">输出</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted/50 rounded-lg p-4 text-sm overflow-auto max-h-96 whitespace-pre-wrap">
                  {formatJson(trace.output)}
                </pre>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 元数据 Tab */}
        <TabsContent value="metadata">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-lg">元数据</CardTitle>
            </CardHeader>
            <CardContent>
              {metadata && Object.keys(metadata).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(metadata).map(([key, value]) => (
                    <div key={key} className="flex items-start justify-between py-2 border-b last:border-0">
                      <span className="text-muted-foreground">{key}</span>
                      <span className="font-mono text-sm max-w-md text-right break-all">
                        {typeof value === 'string' ? value : JSON.stringify(value)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">无元数据</p>
              )}
              
              {/* 显示其他字段 */}
              <div className="mt-4 pt-4 border-t space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">其他信息</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Trace ID: </span>
                    <span className="font-mono">{trace.id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Project ID: </span>
                    <span className="font-mono">{trace.projectId}</span>
                  </div>
                  {trace.difyConnectionId && (
                    <div>
                      <span className="text-muted-foreground">Dify Connection: </span>
                      <span className="font-mono">{trace.difyConnectionId}</span>
                    </div>
                  )}
                  {trace.userId && (
                    <div>
                      <span className="text-muted-foreground">User ID: </span>
                      <span className="font-mono">{trace.userId}</span>
                    </div>
                  )}
                </div>
                {trace.tags && trace.tags.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {trace.tags.map((tag: string, i: number) => (
                      <Badge key={i} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

