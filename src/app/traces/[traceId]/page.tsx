'use client'

import { use } from 'react'
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
} from 'lucide-react'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { trpc } from '@/lib/trpc-client'

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
  return `${(ms / 1000).toFixed(2)}s`
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

interface PageProps {
  params: Promise<{ traceId: string }>
}

export default function TraceDetailPage({ params }: PageProps) {
  const { traceId } = use(params)
  
  // 使用 tRPC 获取真实数据
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

  // Loading 状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // 错误状态
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

  // 解析 metadata
  const metadata = trace.metadata as Record<string, string> | null

  return (
    <div className="space-y-6">
      {/* 面包屑导航 */}
      <Breadcrumb 
        items={[
          { label: 'Traces', href: '/traces' },
          { label: trace.name || traceId }
        ]}
        backHref="/traces"
      />

      {/* 标题和元信息 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            {trace.name || 'Trace'}
            {getStatusBadge(trace.status)}
          </h1>
          <p className="text-muted-foreground mt-1">
            {trace.workflowName || '未知工作流'}
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
              {trace.totalTokens?.toLocaleString() || '-'}
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
            <div className="text-muted-foreground text-sm">状态</div>
            <p className="text-lg font-medium mt-1">
              {trace.status}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 详情 Tabs */}
      <Tabs defaultValue="io" className="space-y-4">
        <TabsList>
          <TabsTrigger value="io">输入/输出</TabsTrigger>
          <TabsTrigger value="metadata">元数据</TabsTrigger>
        </TabsList>

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
                  {trace.sessionId && (
                    <div>
                      <span className="text-muted-foreground">Session ID: </span>
                      <span className="font-mono">{trace.sessionId}</span>
                    </div>
                  )}
                </div>
                {trace.tags && trace.tags.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {trace.tags.map((tag, i) => (
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
