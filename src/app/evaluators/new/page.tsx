'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  ArrowLeft, 
  Save,
  Zap,
  Info,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc-client'
import { toast } from 'sonner'

// 默认 Prompt 模板
const DEFAULT_PROMPT_TEMPLATE = `你是一个专业的 AI 评测专家，负责评估 LLM 回复的质量。

## 评估维度：[维度名称]
[评估说明]

## 输入信息
- **用户问题**: {{input}}
- **AI 回复**: {{output}}

## 评分标准 (0-10分)
- **0-2分**: 极差
- **3-4分**: 较差
- **5-6分**: 一般
- **7-8分**: 良好
- **9-10分**: 优秀

## 输出格式
请以 JSON 格式输出：
{
  "score": <0-10的数字>,
  "reasoning": "<简要说明评分理由>"
}`

export default function NewEvaluatorPage() {
  const router = useRouter()
  
  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    promptTemplate: DEFAULT_PROMPT_TEMPLATE,
    scoreType: 'numeric' as 'numeric' | 'categorical' | 'boolean',
    minScore: 0,
    maxScore: 10,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // tRPC mutation
  const createMutation = trpc.evaluators.create.useMutation({
    onSuccess: () => {
      toast.success('评测器创建成功')
      router.push('/evaluators')
    },
    onError: (err) => {
      toast.error(`创建失败: ${err.message}`)
    },
  })

  // 验证表单
  const validate = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = '请输入评测器名称'
    }
    
    if (!formData.promptTemplate.trim()) {
      newErrors.promptTemplate = '请输入 Prompt 模板'
    } else if (formData.promptTemplate.length < 50) {
      newErrors.promptTemplate = 'Prompt 模板至少需要 50 个字符'
    }
    
    if (!formData.promptTemplate.includes('{{input}}')) {
      newErrors.promptTemplate = 'Prompt 模板必须包含 {{input}} 变量'
    }
    
    if (!formData.promptTemplate.includes('{{output}}')) {
      newErrors.promptTemplate = 'Prompt 模板必须包含 {{output}} 变量'
    }

    if (formData.scoreType === 'numeric') {
      if (formData.minScore >= formData.maxScore) {
        newErrors.minScore = '最小分数必须小于最大分数'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) {
      return
    }

    createMutation.mutate({
      projectId: 'default',
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      promptTemplate: formData.promptTemplate,
      scoreType: formData.scoreType,
      minScore: formData.minScore,
      maxScore: formData.maxScore,
    })
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* 页面标题 */}
      <div className="flex items-center gap-4">
        <Link href="/evaluators">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">创建评测器</h1>
          <p className="text-muted-foreground">
            定义自定义评测维度和 Prompt 模板
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5" />
              基本信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">评测器名称 *</label>
              <Input
                placeholder="例如: 专业性评估"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">描述</label>
              <Input
                placeholder="简要描述此评测器的用途"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Prompt 模板 */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">Prompt 模板 *</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              使用 <Badge variant="secondary">{'{{input}}'}</Badge> 和 <Badge variant="secondary">{'{{output}}'}</Badge> 作为变量占位符
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              className={`font-mono text-sm min-h-[400px] ${errors.promptTemplate ? 'border-red-500' : ''}`}
              placeholder="输入评测 Prompt 模板..."
              value={formData.promptTemplate}
              onChange={(e) => setFormData({ ...formData, promptTemplate: e.target.value })}
            />
            {errors.promptTemplate && (
              <p className="text-sm text-red-500 mt-2">{errors.promptTemplate}</p>
            )}
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>字符数: {formData.promptTemplate.length}</span>
              <span>·</span>
              <span>包含 {'{{input}}'}: {formData.promptTemplate.includes('{{input}}') ? '✓' : '✗'}</span>
              <span>·</span>
              <span>包含 {'{{output}}'}: {formData.promptTemplate.includes('{{output}}') ? '✓' : '✗'}</span>
            </div>
          </CardContent>
        </Card>

        {/* 评分配置 */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">评分配置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">评分类型</label>
              <Select
                value={formData.scoreType}
                onValueChange={(value: 'numeric' | 'categorical' | 'boolean') => 
                  setFormData({ ...formData, scoreType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="numeric">数值型 (0-10)</SelectItem>
                  <SelectItem value="categorical">分类型</SelectItem>
                  <SelectItem value="boolean">布尔型 (是/否)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.scoreType === 'numeric' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">最小分数</label>
                  <Input
                    type="number"
                    value={formData.minScore}
                    onChange={(e) => setFormData({ ...formData, minScore: Number(e.target.value) })}
                    className={errors.minScore ? 'border-red-500' : ''}
                  />
                  {errors.minScore && (
                    <p className="text-sm text-red-500">{errors.minScore}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">最大分数</label>
                  <Input
                    type="number"
                    value={formData.maxScore}
                    onChange={(e) => setFormData({ ...formData, maxScore: Number(e.target.value) })}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 提交按钮 */}
        <div className="flex justify-end gap-4">
          <Link href="/evaluators">
            <Button variant="outline" type="button">
              取消
            </Button>
          </Link>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {createMutation.isPending ? '保存中...' : '保存评测器'}
          </Button>
        </div>
      </form>
    </div>
  )
}
