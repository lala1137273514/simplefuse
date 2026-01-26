'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Play, 
  Zap, 
  Database,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { trpc } from '@/lib/trpc-client'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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

export default function EvaluationCenterPage() {
  const [selectedEvaluators, setSelectedEvaluators] = useState<string[]>([])
  const [selectedLlmConfig, setSelectedLlmConfig] = useState<string>('')
  const [selectedTraces, setSelectedTraces] = useState<string[]>([])

  const utils = trpc.useUtils()

  // 获取评测器列表
  const { data: evaluatorsData, isLoading: isLoadingEvaluators } = trpc.evaluators.list.useQuery({
    type: 'all',
    isActive: true,
  })

  // 获取 LLM 配置列表
  const { data: llmConfigsData, isLoading: isLoadingLlm } = trpc.llmConfigs.list.useQuery({
    projectId: 'default',
  })

  // 获取 Traces 列表
  const { data: tracesData, isLoading: isLoadingTraces } = trpc.traces.list.useQuery({
    projectId: 'default',
    limit: 50,
  })

  // 获取评测任务列表
  const { data: jobsData, isLoading: isLoadingJobs, isFetching: isFetchingJobs } = trpc.evalJobs.list.useQuery({
    projectId: 'default',
    limit: 10,
  })

  // 创建评测任务
  const router = useRouter()
  const createJobMutation = trpc.evalJobs.create.useMutation({
    onSuccess: (result) => {
      toast.success(`评测任务已完成，共 ${result.totalCount} 个子任务`)
      utils.evalJobs.list.invalidate()
      utils.statistics.invalidate()  // 刷新仪表盘统计数据
      setSelectedTraces([])
      // 评测完成后自动跳转到结果页
      router.push(`/results/${result.id}`)
    },
    onError: (err) => toast.error(`创建失败: ${err.message}`),
  })

  const evaluators = evaluatorsData?.evaluators || []
  const llmConfigs = llmConfigsData?.configs || []
  const traces = tracesData?.traces || []
  const jobs = jobsData?.jobs || []

  // 自动选择默认 LLM 配置
  useEffect(() => {
    if (llmConfigs.length > 0 && !selectedLlmConfig) {
      const defaultConfig = llmConfigs.find((c: any) => c.isDefault)
      if (defaultConfig) {
        setSelectedLlmConfig(defaultConfig.id)
      } else {
        setSelectedLlmConfig(llmConfigs[0].id)
      }
    }
  }, [llmConfigs, selectedLlmConfig])

  const handleToggleEvaluator = (id: string) => {
    setSelectedEvaluators(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    )
  }

  const handleSelectAllEvaluators = () => {
    if (selectedEvaluators.length === evaluators.length) {
      setSelectedEvaluators([])
    } else {
      setSelectedEvaluators(evaluators.map((e: any) => e.id))
    }
  }

  const handleToggleTrace = (id: string) => {
    setSelectedTraces(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )
  }

  const handleSelectAllTraces = () => {
    if (selectedTraces.length === traces.length) {
      setSelectedTraces([])
    } else {
      setSelectedTraces(traces.map((t: any) => t.id))
    }
  }

  const handleSubmit = async () => {
    if (selectedEvaluators.length === 0 || selectedTraces.length === 0 || !selectedLlmConfig) {
      toast.error('请选择评测器、Traces和LLM配置')
      return
    }

    createJobMutation.mutate({
      projectId: 'default',
      sourceType: 'traces',
      traceIds: selectedTraces,
      evaluatorIds: selectedEvaluators,
      llmConfigId: selectedLlmConfig,
    })
  }

  const totalTasks = selectedTraces.length * selectedEvaluators.length
  const isLoading = isLoadingEvaluators || isLoadingLlm || isLoadingTraces

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
          <h1 className="text-2xl font-bold">评测中心</h1>
          <p className="text-muted-foreground">
            选择数据源和评测器，开始 LLM 评测
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左侧: 数据源选择 */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                选择数据源
              </CardTitle>
              <CardDescription>
                选择要评测的 Trace 或评测集
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="traces">
                <TabsList>
                  <TabsTrigger value="traces">Traces</TabsTrigger>
                  <TabsTrigger value="dataset">评测集</TabsTrigger>
                </TabsList>
                
                <TabsContent value="traces" className="mt-4">
                  {traces.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Database className="h-12 w-12 mb-4" />
                      <p>暂无 Traces 数据</p>
                      <p className="text-sm mt-1">连接 Dify 或通过 API 发送 Trace</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                      <div className="flex items-center justify-between py-2 sticky top-0 bg-card z-10">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSelectAllTraces}
                        >
                          {selectedTraces.length === traces.length ? '取消全选' : '全选'}
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          已选 {selectedTraces.length} / {traces.length}
                        </span>
                      </div>
                      {traces.map(trace => (
                        <div
                          key={trace.id}
                          className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleToggleTrace(trace.id)}
                        >
                          <Checkbox
                            checked={selectedTraces.includes(trace.id)}
                            onCheckedChange={() => handleToggleTrace(trace.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{trace.name || trace.id.slice(0, 8)}</div>
                            <div className="text-sm text-muted-foreground truncate">
                              {trace.input?.slice(0, 60) || '-'}
                            </div>
                          </div>
                          <Badge variant={trace.status === 'success' ? 'default' : 'destructive'}>
                            {trace.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="dataset" className="mt-4">
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Database className="h-12 w-12 mb-4" />
                    <p>暂无评测集</p>
                    <Button variant="link" className="mt-2" asChild>
                      <Link href="/datasets">创建评测集</Link>
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* 任务历史 */}
          <Card className="glass">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  评测任务历史
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => utils.evalJobs.list.invalidate()}
                  disabled={isFetchingJobs}
                >
                  <RefreshCw className={`h-4 w-4 ${isFetchingJobs ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingJobs ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  暂无评测任务
                </div>
              ) : (
                <div className="space-y-2">
                  {jobs.map((job: any) => (
                    <Link
                      key={job.id}
                      href={`/results?jobId=${job.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50"
                    >
                      {getStatusIcon(job.status)}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{job.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {job.completedCount} / {job.totalCount} 完成
                        </div>
                      </div>
                      <div className="w-20">
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {job.progress}%
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧: 配置面板 */}
        <div className="space-y-4">
          {/* 评测器选择 */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5" />
                选择评测器
              </CardTitle>
            </CardHeader>
            <CardContent>
              {evaluators.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p>暂无评测器</p>
                  <Button variant="link" className="mt-2" asChild>
                    <Link href="/evaluators">查看评测器</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAllEvaluators}
                    >
                      {selectedEvaluators.length === evaluators.length ? '取消全选' : '全选'}
                    </Button>
                  </div>
                  {evaluators.map((evaluator: any) => (
                    <div
                      key={evaluator.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleToggleEvaluator(evaluator.id)}
                    >
                      <Checkbox
                        checked={selectedEvaluators.includes(evaluator.id)}
                        onCheckedChange={() => handleToggleEvaluator(evaluator.id)}
                      />
                      <span className="text-sm">{evaluator.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* LLM 配置选择 */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-lg">LLM 配置</CardTitle>
            </CardHeader>
            <CardContent>
              {llmConfigs.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p>暂无 LLM 配置</p>
                  <Button variant="link" className="mt-2" asChild>
                    <Link href="/settings/llm">添加配置</Link>
                  </Button>
                </div>
              ) : (
                <Select value={selectedLlmConfig} onValueChange={setSelectedLlmConfig}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择 LLM" />
                  </SelectTrigger>
                  <SelectContent>
                    {llmConfigs.map((config: any) => (
                      <SelectItem key={config.id} value={config.id}>
                        {config.name}
                        {config.isDefault && ' (默认)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          {/* 提交按钮 */}
          <Card className="glass">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{totalTasks}</div>
                  <div className="text-sm text-muted-foreground">
                    评测任务数
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {selectedTraces.length} Traces × {selectedEvaluators.length} 评测器
                  </div>
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  disabled={totalTasks === 0 || !selectedLlmConfig || createJobMutation.isPending}
                  onClick={handleSubmit}
                >
                  {createJobMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      提交中...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      开始评测
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
