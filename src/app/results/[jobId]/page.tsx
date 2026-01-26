'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc-client'
import { Breadcrumb } from '@/components/ui/breadcrumb'

function ScoreBadge({ score, size = 'default' }: { score: number; size?: 'default' | 'lg' }) {
  let variant: 'default' | 'destructive' | 'secondary' = 'default'
  let icon = null

  if (score >= 8) {
    variant = 'default'
    icon = <TrendingUp className={size === 'lg' ? 'h-4 w-4' : 'h-3 w-3'} />
  } else if (score >= 6) {
    variant = 'secondary'
  } else {
    variant = 'destructive'
    icon = <TrendingDown className={size === 'lg' ? 'h-4 w-4' : 'h-3 w-3'} />
  }

  return (
    <Badge 
      variant={variant} 
      className={`gap-1 ${size === 'lg' ? 'text-base px-3 py-1' : 'text-sm'} font-bold`}
    >
      {icon}
      {score.toFixed(1)}
    </Badge>
  )
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />
    case 'running':
      return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
    case 'failed':
      return <XCircle className="h-5 w-5 text-red-500" />
    default:
      return <Clock className="h-5 w-5 text-gray-400" />
  }
}

interface ScoreDetail {
  id: string
  evaluatorId: string
  evaluatorName: string
  score: number
  reasoning: string
  createdAt: string
}

interface TraceResult {
  traceId: string
  scores: ScoreDetail[]
}

export default function JobDetailPage() {
  const params = useParams()
  const jobId = params.jobId as string
  
  const [selectedTrace, setSelectedTrace] = useState<TraceResult | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  const utils = trpc.useUtils()

  // 获取任务详情
  const { data: jobData, isLoading: isLoadingJob } = trpc.evalJobs.getById.useQuery({
    id: jobId,
  })

  // 获取任务汇总统计
  const { data: summaryData } = trpc.results.getJobSummary.useQuery({
    projectId: 'default',
    jobId,
  })

  // 获取任务的评测结果（按 Trace 分组）
  const { data: resultsData, isLoading: isLoadingResults, isFetching } = trpc.results.listByJobId.useQuery({
    projectId: 'default',
    jobId,
  })

  const handleRefresh = () => {
    utils.evalJobs.getById.invalidate()
    utils.results.getJobSummary.invalidate()
    utils.results.listByJobId.invalidate()
  }

  const handleViewDetail = (trace: TraceResult) => {
    setSelectedTrace(trace)
    setShowDetail(true)
  }

  const job = jobData
  const traces = resultsData?.traces || []
  const evaluators = summaryData?.evaluators || []

  const isLoading = isLoadingJob || isLoadingResults

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <p className="text-muted-foreground mb-4">评测任务不存在</p>
        <Button asChild>
          <Link href="/results">返回列表</Link>
        </Button>
      </div>
    )
  }

  // 计算每个 Trace 的平均分
  const tracesWithAvg = traces.map((trace: any) => ({
    ...trace,
    avgScore: trace.scores.length > 0
      ? trace.scores.reduce((sum: any, s: any) => sum + s.score, 0) / trace.scores.length
      : 0,
  }))

  return (
    <div className="space-y-6">
      {/* 面包屑导航 */}
      <Breadcrumb 
        items={[
          { label: '评测中心', href: '/evaluation-center' },
          { label: '评测结果', href: '/results' },
          { label: job.name || '任务详情' }
        ]}
        backHref="/results"
      />

      {/* 任务标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getStatusIcon(job.status)}
          <div>
            <h1 className="text-2xl font-bold">{job.name}</h1>
            <p className="text-muted-foreground">
              {new Date(job.createdAt).toLocaleString('zh-CN')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/results">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回列表
            </Link>
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 评测器汇总 */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">评测维度统计</CardTitle>
        </CardHeader>
        <CardContent>
          {evaluators.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              暂无评测数据
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-5">
              {evaluators.map((evaluator: any) => (
                <div 
                  key={evaluator.name} 
                  className="text-center p-4 rounded-lg bg-muted/50"
                >
                  <div className="text-2xl font-bold">
                    {evaluator.avgScore.toFixed(1)}
                  </div>
                  <div className="text-sm text-muted-foreground">{evaluator.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {evaluator.count} 条评测
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Traces 列表 */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">
            评测结果 ({traces.length} 条 Trace)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {traces.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无评测结果
            </div>
          ) : (
            <div className="space-y-3">
              {tracesWithAvg.map((trace: any) => (
                <div
                  key={trace.traceId}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleViewDetail(trace)}
                >
                  <div className="flex items-center gap-4">
                    <div className="font-mono text-sm text-muted-foreground">
                      {trace.traceId.slice(0, 8)}...
                    </div>
                    {/* 一行展示所有维度分数 */}
                    <div className="flex gap-2 flex-wrap">
                      {trace.scores.map((score: any) => (
                        <div 
                          key={score.id} 
                          className="flex items-center gap-1 text-sm"
                        >
                          <span className="text-muted-foreground">{score.evaluatorName}:</span>
                          <ScoreBadge score={score.score} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">平均分</div>
                      <ScoreBadge score={trace.avgScore} size="lg" />
                    </div>
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 详情弹窗 */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              Trace: {selectedTrace?.traceId.slice(0, 12)}...
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* 各维度评分 */}
            {selectedTrace?.scores.map((score: any) => (
              <div key={score.id} className="space-y-2 p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{score.evaluatorName}</Badge>
                  <ScoreBadge score={score.score} size="lg" />
                </div>
                <div className="text-sm">
                  <span className="font-medium">评测理由：</span>
                  <p className="text-muted-foreground mt-1">
                    {score.reasoning || '无评测理由'}
                  </p>
                </div>
              </div>
            ))}

            {/* 查看原始 Trace */}
            <div className="flex justify-end pt-2">
              <Link href={`/traces/${selectedTrace?.traceId}`}>
                <Button variant="link" size="sm">
                  查看完整 Trace →
                </Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
