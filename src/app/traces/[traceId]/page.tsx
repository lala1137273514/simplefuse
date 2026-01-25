'use client'

import { use } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  Copy,
} from 'lucide-react'
import { Breadcrumb } from '@/components/ui/breadcrumb'

// 模拟数据 - 实际会从 tRPC 获取
const mockTrace = {
  id: 'trace-001',
  name: '客服对话',
  workflowName: '智能客服工作流',
  timestamp: '2026-01-24T12:30:00',
  status: 'success',
  totalTokens: 1250,
  latencyMs: 2340,
  input: JSON.stringify({ message: '你好，我想咨询一下产品价格' }, null, 2),
  output: JSON.stringify({ 
    response: '您好！很高兴为您服务。请问您想咨询哪款产品的价格呢？我们有以下几个产品系列...' 
  }, null, 2),
  metadata: {
    userId: 'user-123',
    sessionId: 'session-456',
    source: 'web',
  },
  observations: [
    {
      id: 'obs-1',
      name: 'LLM 调用',
      type: 'llm',
      model: 'gpt-4',
      startTime: '2026-01-24T12:30:00.100',
      endTime: '2026-01-24T12:30:02.200',
      latencyMs: 2100,
      tokens: { prompt: 150, completion: 200, total: 350 },
      status: 'success',
    },
    {
      id: 'obs-2',
      name: '知识库检索',
      type: 'retrieval',
      startTime: '2026-01-24T12:30:00.000',
      endTime: '2026-01-24T12:30:00.100',
      latencyMs: 100,
      status: 'success',
    },
  ],
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'success':
      return (
        <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
          <CheckCircle2 className="h-3 w-3" />
          成功
        </Badge>
      )
    case 'error':
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
  return new Date(timestamp).toLocaleString('zh-CN')
}

function formatLatency(ms: number) {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

interface PageProps {
  params: Promise<{ traceId: string }>
}

export default function TraceDetailPage({ params }: PageProps) {
  const { traceId } = use(params)
  const trace = mockTrace // 实际会根据 traceId 获取

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
            {trace.name}
            {getStatusBadge(trace.status)}
          </h1>
          <p className="text-muted-foreground mt-1">
            {trace.workflowName}
          </p>
        </div>
        <Button variant="outline" size="sm">
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
              {trace.totalTokens.toLocaleString()}
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
              {trace.observations.length}
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

        <TabsContent value="timeline">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-lg">执行时间线</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {trace.observations.map((obs, index) => (
                <div key={obs.id} className="relative pl-6">
                  {/* 时间线连接线 */}
                  {index < trace.observations.length - 1 && (
                    <div className="absolute left-[11px] top-6 w-0.5 h-full bg-border" />
                  )}
                  
                  {/* 时间线节点 */}
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  
                  {/* 节点内容 */}
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{obs.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {obs.type}
                        </Badge>
                        {obs.model && (
                          <Badge variant="outline" className="text-xs">
                            {obs.model}
                          </Badge>
                        )}
                      </div>
                      {getStatusBadge(obs.status)}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>延迟: {formatLatency(obs.latencyMs)}</span>
                      {obs.tokens && (
                        <span>
                          Tokens: {obs.tokens.prompt} + {obs.tokens.completion} = {obs.tokens.total}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="io">
          <div className="grid grid-cols-2 gap-4">
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-lg">输入</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted/50 rounded-lg p-4 text-sm overflow-auto max-h-96">
                  {trace.input}
                </pre>
              </CardContent>
            </Card>
            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-lg">输出</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted/50 rounded-lg p-4 text-sm overflow-auto max-h-96">
                  {trace.output}
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
              <div className="space-y-3">
                {Object.entries(trace.metadata).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-muted-foreground">{key}</span>
                    <span className="font-mono text-sm">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
