'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
  Loader2,
  Database,
} from 'lucide-react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc-client'

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
  const [page, setPage] = useState(0)
  const pageSize = 20

  const utils = trpc.useUtils()

  // 查询 Traces
  const { data, isLoading, isFetching } = trpc.traces.list.useQuery({
    projectId: 'default',
    limit: pageSize,
    offset: page * pageSize,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    name: searchQuery || undefined,
  })

  const handleRefresh = () => {
    utils.traces.list.invalidate()
  }

  const traces = data?.traces || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / pageSize)

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

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
        <Button variant="outline" onClick={handleRefresh} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
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
                placeholder="搜索 Trace 名称..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(0)
                }}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0) }}>
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
        <CardContent className="p-0">
          {traces.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <Database className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">暂无 Trace 数据</h3>
              <p className="text-muted-foreground text-center">
                连接 Dify 或通过 API 发送 Trace 数据
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>工作流</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      延迟
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      <Zap className="h-4 w-4" />
                      Tokens
                    </div>
                  </TableHead>
                  <TableHead>时间</TableHead>
                  <TableHead>输入预览</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {traces.map((trace) => (
                  <TableRow key={trace.id} className="group cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link href={`/traces/${trace.id}`} className="font-medium hover:underline">
                        {trace.name || trace.id.slice(0, 8)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {trace.workflowName || '-'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(trace.status)}
                    </TableCell>
                    <TableCell>
                      {formatLatency(trace.latencyMs || 0)}
                    </TableCell>
                    <TableCell>
                      {(trace.totalTokens || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatTime(trace.timestamp)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {trace.input?.slice(0, 50) || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            共 {total} 条记录，第 {page + 1} / {totalPages} 页
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
