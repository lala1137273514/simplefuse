'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Plus, 
  Zap, 
  Star,
  Edit,
  Trash2,
  RefreshCw,
  Key,
  Globe,
  Check,
  Loader2,
  Wifi,
} from 'lucide-react'
import { trpc } from '@/lib/trpc-client'
import { toast } from 'sonner'
import { Breadcrumb } from '@/components/ui/breadcrumb'

const providers = [
  { value: 'openai', label: 'OpenAI', icon: '🤖', defaultEndpoint: 'https://api.openai.com/v1' },
  { value: 'azure', label: 'Azure OpenAI', icon: '☁️', defaultEndpoint: '' },
  { value: 'dashscope', label: '通义千问', icon: '🌟', defaultEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  { value: 'ollama', label: 'Ollama', icon: '🦙', defaultEndpoint: 'http://localhost:11434/v1' },
  { value: 'custom', label: '自定义', icon: '⚙️', defaultEndpoint: '' },
]

function getProviderLabel(provider: string) {
  return providers.find(p => p.value === provider)?.label || provider
}

function getProviderIcon(provider: string) {
  return providers.find(p => p.value === provider)?.icon || '🤖'
}

function getDefaultEndpoint(provider: string) {
  return providers.find(p => p.value === provider)?.defaultEndpoint || ''
}

interface LlmConfig {
  id: string
  name: string
  provider: string
  modelName: string
  apiEndpoint: string | null
  hasApiKey: boolean
  isDefault: boolean
}

function LlmConfigCard({ config, onEdit, onDelete, onSetDefault }: {
  config: LlmConfig
  onEdit: () => void
  onDelete: () => void
  onSetDefault: () => void
}) {
  return (
    <Card className="glass group hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-xl">
              {getProviderIcon(config.provider)}
            </div>
            {config.isDefault && (
              <Badge className="gap-1 bg-yellow-500/10 text-yellow-600 border-yellow-200">
                <Star className="h-3 w-3" />
                默认
              </Badge>
            )}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!config.isDefault && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSetDefault} title="设为默认">
                <Star className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardTitle className="text-base mt-2">{config.name}</CardTitle>
        <CardDescription>
          {getProviderLabel(config.provider)} · {config.modelName}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Key className="h-4 w-4" />
            {config.hasApiKey ? (
              <span className="text-green-600">已配置</span>
            ) : (
              <span className="text-yellow-600">未配置</span>
            )}
          </div>
          {config.apiEndpoint && (
            <div className="flex items-center gap-1">
              <Globe className="h-4 w-4" />
              <span className="truncate max-w-[100px]">{config.apiEndpoint}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function LlmSettingsPage() {
  const [showForm, setShowForm] = useState(false)
  const [editingConfig, setEditingConfig] = useState<LlmConfig | null>(null)
  const [isTesting, setIsTesting] = useState(false)
  
  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    provider: 'openai',
    modelName: '',
    apiEndpoint: '',
    apiKey: '',
  })

  const utils = trpc.useUtils()

  // 查询 LLM 配置列表
  const { data, isLoading } = trpc.llmConfigs.list.useQuery({
    projectId: 'default',
  })

  // Mutations
  const createMutation = trpc.llmConfigs.create.useMutation({
    onSuccess: () => {
      toast.success('配置创建成功')
      utils.llmConfigs.list.invalidate()
      setShowForm(false)
      resetForm()
    },
    onError: (err) => toast.error(`创建失败: ${err.message}`),
  })

  const updateMutation = trpc.llmConfigs.update.useMutation({
    onSuccess: () => {
      toast.success('配置更新成功')
      utils.llmConfigs.list.invalidate()
      setShowForm(false)
      resetForm()
    },
    onError: (err) => toast.error(`更新失败: ${err.message}`),
  })

  const deleteMutation = trpc.llmConfigs.delete.useMutation({
    onSuccess: () => {
      toast.success('配置已删除')
      utils.llmConfigs.list.invalidate()
    },
    onError: (err) => toast.error(`删除失败: ${err.message}`),
  })

  const setDefaultMutation = trpc.llmConfigs.setDefault.useMutation({
    onSuccess: () => {
      toast.success('已设为默认配置')
      utils.llmConfigs.list.invalidate()
    },
    onError: (err) => toast.error(`设置失败: ${err.message}`),
  })

  const testConnectionMutation = trpc.llmConfigs.testConnection.useMutation()

  const resetForm = () => {
    setFormData({
      name: '',
      provider: 'openai',
      modelName: '',
      apiEndpoint: '',
      apiKey: '',
    })
    setEditingConfig(null)
  }

  const handleCreate = () => {
    resetForm()
    setFormData(prev => ({
      ...prev,
      apiEndpoint: getDefaultEndpoint('openai'),
    }))
    setShowForm(true)
  }

  const handleEdit = (config: LlmConfig) => {
    setEditingConfig(config)
    setFormData({
      name: config.name,
      provider: config.provider,
      modelName: config.modelName,
      apiEndpoint: config.apiEndpoint || getDefaultEndpoint(config.provider),
      apiKey: '',
    })
    setShowForm(true)
  }

  const handleDelete = (config: LlmConfig) => {
    if (confirm('确定要删除此配置吗？')) {
      deleteMutation.mutate({ id: config.id })
    }
  }

  const handleSetDefault = (config: LlmConfig) => {
    setDefaultMutation.mutate({ id: config.id, projectId: 'default' })
  }

  const handleProviderChange = (provider: string) => {
    setFormData({
      ...formData,
      provider,
      apiEndpoint: getDefaultEndpoint(provider),
    })
  }

  const handleTestConnection = async () => {
    if (!formData.apiKey) {
      toast.error('请输入 API Key')
      return
    }

    setIsTesting(true)
    try {
      const result = await testConnectionMutation.mutateAsync({
        provider: formData.provider as any,
        apiEndpoint: formData.apiEndpoint || undefined,
        apiKey: formData.apiKey,
        modelName: formData.modelName || 'test',
      })
      
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (err: any) {
      toast.error(`测试失败: ${err.message}`)
    }
    setIsTesting(false)
  }

  const handleSubmit = () => {
    // Validate required fields
    if (!formData.name.trim()) {
      toast.error('请输入配置名称')
      return
    }
    if (!formData.modelName.trim()) {
      toast.error('请输入模型名称')
      return
    }
    if (!editingConfig && !formData.apiKey.trim()) {
      toast.error('请输入 API Key')
      return
    }

    const provider = formData.provider as 'openai' | 'azure' | 'dashscope' | 'ollama' | 'custom'
    
    if (editingConfig) {
      updateMutation.mutate({
        id: editingConfig.id,
        name: formData.name.trim(),
        provider,
        modelName: formData.modelName.trim(),
        apiEndpoint: formData.apiEndpoint || null,
        apiKey: formData.apiKey || undefined,
      })
    } else {
      createMutation.mutate({
        projectId: 'default',
        name: formData.name.trim(),
        provider,
        modelName: formData.modelName.trim(),
        apiEndpoint: formData.apiEndpoint || undefined,
        apiKey: formData.apiKey,
      })
    }
  }

  const configs = (data?.configs || []) as LlmConfig[]

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
          { label: '设置', href: '/settings' },
          { label: 'LLM 配置' }
        ]}
        backHref="/"
      />

      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">LLM 配置</h1>
          <p className="text-muted-foreground">
            管理用于评测的 LLM 模型配置
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => utils.llmConfigs.list.invalidate()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            添加配置
          </Button>
        </div>
      </div>

      {/* 配置列表 */}
      {configs.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Zap className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">暂无 LLM 配置</h3>
            <p className="text-muted-foreground text-center mb-4">
              添加 LLM 配置以开始评测
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              添加配置
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {configs.map((config) => (
            <LlmConfigCard
              key={config.id}
              config={config}
              onEdit={() => handleEdit(config)}
              onDelete={() => handleDelete(config)}
              onSetDefault={() => handleSetDefault(config)}
            />
          ))}
        </div>
      )}

      {/* 创建/编辑表单弹窗 */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? '编辑 LLM 配置' : '添加 LLM 配置'}
            </DialogTitle>
            <DialogDescription>
              配置用于评测的 LLM 模型
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">配置名称</label>
              <Input
                placeholder="例如: OpenAI GPT-4"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Provider</label>
              <Select
                value={formData.provider}
                onValueChange={handleProviderChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择 Provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="flex items-center gap-2">
                        <span>{p.icon}</span>
                        <span>{p.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">模型名称</label>
              <Input
                placeholder="例如: gpt-4-turbo, qwen-max"
                value={formData.modelName}
                onChange={(e) => setFormData({ ...formData, modelName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Globe className="h-4 w-4" />
                API Endpoint
              </label>
              <Input
                placeholder="https://api.openai.com/v1"
                value={formData.apiEndpoint}
                onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                不同 Provider 有不同的默认地址
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Key className="h-4 w-4" />
                API Key
              </label>
              <Input
                type="password"
                placeholder={editingConfig?.hasApiKey ? '已配置，留空保持不变' : '输入 API Key'}
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                API Key 将被加密存储
              </p>
            </div>

            {/* 测试连接按钮 */}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleTestConnection}
              disabled={isTesting || !formData.apiKey}
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wifi className="h-4 w-4 mr-2" />
              )}
              测试连接
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              取消
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              <Check className="h-4 w-4 mr-2" />
              {editingConfig ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
