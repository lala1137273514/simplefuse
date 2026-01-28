'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  BarChart3,
  ChevronRight,
  Calendar,
} from 'lucide-react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc-client'
import { Breadcrumb } from '@/components/ui/breadcrumb'

function getStatusIcon(status: string) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    case 'running':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />
    default:
      return <Clock className="h-4 w-4 text-gray-400" />
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge variant="default">已完成</Badge>
    case 'running':
      return <Badge variant="secondary">进行中</Badge>
    case 'failed':
      return <Badge variant="destructive">失败</Badge>
    default:
      return <Badge variant="outline">待执行</Badge>
  }
}

export default function ResultsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const utils = trpc.useUtils()

  // 获取评测任务列表
  const { data: jobsData, isLoading, isFetching } = trpc.evalJobs.list.useQuery({
    projectId: 'default',
    status: statusFilter !== 'all' ? statusFilter as 'pending' | 'running' | 'completed' | 'failed' : undefined,
    limit: 50,
  }, {
    refetchOnWindowFocus: false,
    retry: 1,
    refetchInterval: (data: any) => {
        const hasRunning = data?.jobs?.some((job: any) => job.status === 'running');
        return hasRunning ? 3000 : false;
    }
  })

  const handleRefresh = () => {
    utils.evalJobs.list.invalidate()
  }

  const jobs = jobsData?.jobs || []

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 面包屑导航 */}
      <Breadcrumb 
        items={[
          { label: '评测中心', href: '/evaluation-center' },
          { label: '评测结果' }
        ]}
        backHref="/evaluation-center"
      />

      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">评测结果</h1>
          <p className="text-muted-foreground">
            查看和管理评测任务的结果
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="状态筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
              <SelectItem value="running">进行中</SelectItem>
              <SelectItem value="failed">失败</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRefresh} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 任务列表 */}
      {jobs.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">暂无评测任务</h3>
            <p className="text-muted-foreground text-center">
              运行评测任务后，结果将显示在这里
            </p>
            <Button variant="link" className="mt-2" asChild>
              <Link href="/evaluation-center">前往评测中心</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job: any) => (
            <Link key={job.id} href={`/results/${job.id}`}>
              <Card className="glass cursor-pointer hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(job.status)}
                      <CardTitle className="text-lg">{job.name}</CardTitle>
                      {getStatusBadge(job.status)}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {job.createdAt ? new Date(job.createdAt).toLocaleString('zh-CN') : '-'}
                      </span>
                      <span>
                        {job.completedCount} / {job.totalCount} 完成
                      </span>
                      {job.failedCount > 0 && (
                        <span className="text-red-500">
                          {job.failedCount} 失败
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {job.progress}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
