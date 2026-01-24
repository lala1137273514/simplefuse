'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'

// 模拟数据 - 实际会从 tRPC 获取
const mockTraces = [
  {
    id: 'trace-001',
    name: '客服对话',
    workflowName: '智能客服工作流',
    timestamp: '2026-01-24T12:30:00',
    status: 'success',
    totalTokens: 1250,
    latencyMs: 2340,
    input: '你好，我想咨询一下产品价格',
  },
  {
    id: 'trace-002',
    name: '知识问答',
    workflowName: '知识库检索工作流',
    timestamp: '2026-01-24T12:25:00',
    status: 'success',
    totalTokens: 890,
    latencyMs: 1560,
    input: '公司的退换货政策是什么？',
  },
  {
    id: 'trace-003',
    name: '意图识别',
    workflowName: '意图分类工作流',
    timestamp: '2026-01-24T12:20:00',
    status: 'error',
    totalTokens: 320,
    latencyMs: 890,
    input: '我要投诉！',
  },
  {
    id: 'trace-004',
    name: '摘要生成',
    workflowName: '对话摘要工作流',
    timestamp: '2026-01-24T12:15:00',
    status: 'success',
    totalTokens: 2100,
    latencyMs: 3200,
    input: '[长对话内容]',
  },
]

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
      return (
        <Badge variant="outline" className="gap-1">
          {status}
        </Badge>
      )
  }
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatLatency(ms: number) {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export default function TracesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(false)

  const handleRefresh = () => {
    setIsLoading(true)
    // 模拟刷新
    setTimeout(() => setIsLoading(false), 1000)
  }

  const filteredTraces = mockTraces.filter(trace => {
    if (statusFilter !== 'all' && trace.status !== statusFilter) return false
    if (searchQuery && !trace.name.includes(searchQuery) && !trace.input.includes(searchQuery)) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Traces</h1>
          <p className="text-muted-foreground">
            查看和分析 LLM 调用记录
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* 筛选器 */}
      <Card className="glass">
        <CardContent className="pt-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="搜索 Trace 名称或内容..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="success">成功</SelectItem>
                <SelectItem value="error">错误</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Trace 列表 */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Trace 列表</span>
            <span className="text-sm font-normal text-muted-foreground">
              共 {filteredTraces.length} 条记录
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">名称</TableHead>
                <TableHead>工作流</TableHead>
                <TableHead className="w-[150px]">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    时间
                  </div>
                </TableHead>
                <TableHead className="w-[100px]">状态</TableHead>
                <TableHead className="w-[100px] text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Zap className="h-4 w-4" />
                    Tokens
                  </div>
                </TableHead>
                <TableHead className="w-[100px] text-right">延迟</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTraces.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                filteredTraces.map((trace) => (
                  <TableRow key={trace.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link 
                        href={`/traces/${trace.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {trace.name}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {trace.input}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {trace.workflowName}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatTime(trace.timestamp)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(trace.status)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {trace.totalTokens.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatLatency(trace.latencyMs)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* 分页 */}
        <div className="flex items-center justify-between px-6 py-4 border-t">
          <p className="text-sm text-muted-foreground">
            显示 1-{filteredTraces.length} 条，共 {filteredTraces.length} 条
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft className="h-4 w-4" />
              上一页
            </Button>
            <Button variant="outline" size="sm" disabled>
              下一页
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
