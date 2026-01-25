'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Activity,
  TestTube2,
  TrendingUp,
  Clock,
  ArrowRight,
  Zap,
  RefreshCw,
  Coins,
  Loader2,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  Legend,
} from 'recharts'
import Link from 'next/link'
import { trpc } from '@/lib/trpc-client'

// 动画数字组件
function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [displayed, setDisplayed] = useState(0)
  
  useEffect(() => {
    const duration = 1000
    const steps = 30
    const stepValue = value / steps
    let current = 0
    
    // 如果值很小，直接显示
    if (value < steps) {
      const t = setTimeout(() => setDisplayed(value), 0)
      return () => clearTimeout(t)
    }

    const timer = setInterval(() => {
      current += stepValue
      if (current >= value) {
        setDisplayed(value)
        clearInterval(timer)
      } else {
        setDisplayed(Math.floor(current))
      }
    }, duration / steps)
    
    return () => clearInterval(timer)
  }, [value])
  
  return (
    <span>
      {displayed.toLocaleString()}{suffix}
    </span>
  )
}

// 统计卡片组件
function StatsCards({ 
  totalTraces,
  totalEvaluations,
  avgScore,
  totalTokens 
}: { 
  totalTraces: number
  totalEvaluations: number
  avgScore: number
  totalTokens: number
}) {
  const cards = [
    {
      title: '总 Traces',
      value: totalTraces,
      icon: Activity,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: '评测次数',
      value: totalEvaluations,
      icon: TestTube2,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: '平均评分',
      value: avgScore,
      suffix: ' / 10',
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Token 消耗',
      value: Math.round(totalTokens / 1000),
      suffix: 'K',
      icon: Coins,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`rounded-lg p-2 ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <AnimatedNumber value={card.value} suffix={card.suffix || ''} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// 评分趋势图
function ScoreTrendChart({ data }: { data: any[] }) {
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-lg">评分趋势</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis domain={[0, 10]} className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="avgScore" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                  fill="url(#scoreGradient)"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
             <div className="flex h-full items-center justify-center text-muted-foreground">
               暂无数据
             </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// 维度雷达图
function DimensionRadar({ data }: { data: any[] }) {
  // 转换数据格式以适配雷达图
  const chartData = data.map(d => ({
    name: d.name,
    value: d.avgScore,
    fullMark: 10
  }))

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-lg">维度评分</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData}>
                <PolarGrid className="stroke-muted" />
                <PolarAngleAxis dataKey="name" className="text-xs" />
                <PolarRadiusAxis domain={[0, 10]} className="text-xs" />
                <Radar
                  name="评分"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              暂无数据
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// 延迟分布直方图
function LatencyHistogram({ data }: { data: any[] }) {
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-lg">延迟分布</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="range" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                  opacity={0.8}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              暂无数据
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// 延迟分位数卡片
function LatencyPercentiles({ p50, p90, p99 }: { p50: number, p90: number, p99: number }) {
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          延迟分位数
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="rounded-lg bg-muted/50 p-4">
            <div className="text-2xl font-bold text-green-500">{p50}ms</div>
            <div className="text-sm text-muted-foreground">P50</div>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <div className="text-2xl font-bold text-yellow-500">{p90}ms</div>
            <div className="text-sm text-muted-foreground">P90</div>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <div className="text-2xl font-bold text-red-500">{p99}ms</div>
            <div className="text-sm text-muted-foreground">P99</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<'1d' | '7d' | '30d' | '90d'>('7d')
  
  const utils = trpc.useUtils()

  // Task 9.2: 使用合并的 dashboardOverview 端点 (减少 6 个请求为 1 个)
  const { data: dashboard, isLoading, isFetching: isRefreshing } = trpc.statistics.dashboardOverview.useQuery({
    projectId: 'default',
    timeRange,
  }, {
    refetchInterval: 30000,  // 每 30 秒自动刷新
  })

  const handleRefresh = () => {
    utils.statistics.invalidate()
  }

  // 从合并响应中提取数据
  const overview = dashboard?.overview
  const scoreStats = dashboard?.scoreStats
  const scoreTrend = dashboard?.scoreTrend
  const dimensionScores = dashboard?.dimensionScores
  const latencyPercentiles = dashboard?.latencyPercentiles
  const latencyDistribution = dashboard?.latencyDistribution

  // 当没有评测时不显示评分相关数据
  const hasEvaluations = (overview?.totalEvaluations ?? 0) > 0

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">仪表盘</h1>
          <p className="text-muted-foreground">
            监控您的 LLM 应用性能和评测结果
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">最近 1 天</SelectItem>
              <SelectItem value="7d">最近 7 天</SelectItem>
              <SelectItem value="30d">最近 30 天</SelectItem>
              <SelectItem value="90d">最近 90 天</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* 统计卡片 */}
          <StatsCards 
            totalTraces={overview?.totalTraces || 0}
            totalEvaluations={overview?.totalEvaluations || 0}
            avgScore={scoreStats?.avgScore || 0}
            totalTokens={overview?.totalTokens || 0}
          />

          {/* 图表区域 - 只有在有评测数据时才显示评分相关图表 */}
          <div className="grid gap-6 lg:grid-cols-2">
            {hasEvaluations ? (
              <>
                <ScoreTrendChart data={scoreTrend || []} />
                <DimensionRadar data={dimensionScores || []} />
              </>
            ) : (
              <Card className="glass lg:col-span-2">
                <CardContent className="flex flex-col items-center justify-center h-[300px] text-center">
                  <TestTube2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">暂无评测数据</h3>
                  <p className="text-muted-foreground mb-4">
                    请先在评测中心运行评测任务
                  </p>
                  <Link href="/evaluation-center">
                    <Button>
                      前往评测中心
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <LatencyHistogram data={latencyDistribution || []} />
            <LatencyPercentiles 
              p50={latencyPercentiles?.p50 || 0}
              p90={latencyPercentiles?.p90 || 0}
              p99={latencyPercentiles?.p99 || 0}
            />
          </div>
        </>
      )}

      {/* 快速入口 */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>快速入口</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/traces" className="group">
              <div className="rounded-lg border border-dashed p-4 text-center hover:border-primary transition-colors">
                <Activity className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-medium">查看 Traces</h3>
                <p className="text-sm text-muted-foreground mt-1">浏览所有 Trace 记录</p>
              </div>
            </Link>
            <Link href="/evaluation-center" className="group">
              <div className="rounded-lg border border-dashed p-4 text-center hover:border-primary transition-colors">
                <TestTube2 className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-medium">评测中心</h3>
                <p className="text-sm text-muted-foreground mt-1">运行 LLM 评测</p>
              </div>
            </Link>
            <Link href="/datasets" className="group">
              <div className="rounded-lg border border-dashed p-4 text-center hover:border-primary transition-colors">
                <Zap className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-medium">评测集</h3>
                <p className="text-sm text-muted-foreground mt-1">管理评测数据集</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
