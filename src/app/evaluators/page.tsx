'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  Zap, 
  Star,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { trpc } from '@/lib/trpc-client'
import { toast } from 'sonner'

interface Evaluator {
  id: string
  name: string
  description: string | null
  scoreType: string
  minScore: number
  maxScore: number
  isPreset: boolean
  isActive: boolean
}

function EvaluatorCard({ 
  evaluator, 
  onDelete,
  isDeleting,
}: { 
  evaluator: Evaluator
  onDelete?: () => void
  isDeleting?: boolean
}) {
  return (
    <Card className="glass group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            {evaluator.isPreset && (
              <Badge variant="secondary" className="gap-1">
                <Star className="h-3 w-3" />
                预置
              </Badge>
            )}
            {evaluator.isActive && (
              <Badge variant="outline" className="gap-1 text-green-600 border-green-200">
                <CheckCircle2 className="h-3 w-3" />
                启用
              </Badge>
            )}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link href={`/evaluators/${evaluator.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            {!evaluator.isPreset && (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <Link href={`/evaluators/${evaluator.id}/edit`}>
                    <Edit className="h-4 w-4" />
                  </Link>
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-destructive"
                  onClick={onDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
        <CardTitle className="text-base mt-2">{evaluator.name}</CardTitle>
        <CardDescription className="line-clamp-2">
          {evaluator.description || '暂无描述'}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">
            {evaluator.scoreType === 'numeric' ? '数值型' : 
             evaluator.scoreType === 'boolean' ? '布尔型' : '分类型'}
          </Badge>
          {evaluator.scoreType === 'numeric' && (
            <span>{evaluator.minScore}-{evaluator.maxScore} 分</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function EvaluatorsPage() {
  const utils = trpc.useUtils()

  // 获取所有评测器
  const { data, isLoading, isFetching } = trpc.evaluators.list.useQuery({
    type: 'all',
  })

  const deleteMutation = trpc.evaluators.delete.useMutation({
    onSuccess: () => {
      toast.success('评测器已删除')
      utils.evaluators.list.invalidate()
    },
    onError: (err) => toast.error(`删除失败: ${err.message}`),
  })

  const handleRefresh = () => {
    utils.evaluators.list.invalidate()
  }

  const handleDelete = (id: string) => {
    if (confirm('确定要删除此评测器吗？')) {
      deleteMutation.mutate({ id })
    }
  }

  const presetEvaluators = (data?.evaluators || []).filter(e => e.isPreset) as Evaluator[]
  const customEvaluators = (data?.evaluators || []).filter(e => !e.isPreset) as Evaluator[]

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
          <h1 className="text-2xl font-bold">评测器</h1>
          <p className="text-muted-foreground">
            管理 LLM 输出评测的规则和标准
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button asChild>
            <Link href="/evaluators/new">
              <Plus className="h-4 w-4 mr-2" />
              创建评测器
            </Link>
          </Button>
        </div>
      </div>

      {/* 评测器列表 */}
      <Tabs defaultValue="preset" className="space-y-4">
        <TabsList>
          <TabsTrigger value="preset">
            预置评测器
            <Badge variant="secondary" className="ml-1">{presetEvaluators.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="custom">
            自定义评测器
            <Badge variant="secondary" className="ml-1">{customEvaluators.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preset" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {presetEvaluators.map((evaluator) => (
              <EvaluatorCard 
                key={evaluator.id} 
                evaluator={evaluator} 
              />
            ))}
          </div>
          {presetEvaluators.length === 0 && (
            <Card className="glass">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                  <Star className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">暂无预置评测器</h3>
                <p className="text-muted-foreground text-center">
                  运行 Seed 脚本初始化预置评测器
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          {customEvaluators.length === 0 ? (
            <Card className="glass">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                  <Zap className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">暂无自定义评测器</h3>
                <p className="text-muted-foreground text-center mb-4">
                  创建自定义评测器来满足特定需求
                </p>
                <Button asChild>
                  <Link href="/evaluators/new">
                    <Plus className="h-4 w-4 mr-2" />
                    创建评测器
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {customEvaluators.map((evaluator) => (
                <EvaluatorCard 
                  key={evaluator.id} 
                  evaluator={evaluator}
                  onDelete={() => handleDelete(evaluator.id)}
                  isDeleting={deleteMutation.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
