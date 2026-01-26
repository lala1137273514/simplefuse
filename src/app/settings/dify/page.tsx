'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { 
  Plus, 
  Workflow,
  RefreshCw,
  Trash2,
  Copy,
  CheckCircle2,
  XCircle,
  Link as LinkIcon,
  Key,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react'
import { trpc } from '@/lib/trpc-client'
import { toast } from 'sonner'
import { Breadcrumb } from '@/components/ui/breadcrumb'

interface DifyConnection {
  id: string
  name: string
  apiEndpoint: string
  isActive: boolean
  lastSyncAt: string | null
  webhookUrl: string
  webhookSecret: string
  workflows: { id: string; name: string }[]
}

function ConnectionCard({ 
  connection, 
  onTest, 
  onSync, 
  onToggle,
  onRegenerateSecret,
  onDelete,
  isTestLoading,
  isSyncLoading,
}: {
  connection: DifyConnection
  onTest: () => void
  onSync: () => void
  onToggle: (active: boolean) => void
  onRegenerateSecret: () => void
  onDelete: () => void
  isTestLoading?: boolean
  isSyncLoading?: boolean
}) {
  const [showSecret, setShowSecret] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    toast.success('已复制到剪贴板')
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <Card className="glass">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Workflow className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{connection.name}</CardTitle>
              <CardDescription>{connection.apiEndpoint}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={connection.isActive}
              onCheckedChange={onToggle}
            />
            {connection.isActive ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                已启用
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <XCircle className="h-3 w-3" />
                已禁用
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Webhook URL */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Webhook URL
          </label>
          <div className="flex gap-2">
            <Input value={connection.webhookUrl} readOnly className="font-mono text-sm" />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(connection.webhookUrl, 'url')}
            >
              {copied === 'url' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Webhook Secret */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Key className="h-4 w-4" />
            Webhook Secret
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                value={showSecret ? connection.webhookSecret : '••••••••••••••••'}
                readOnly
                className="font-mono text-sm pr-10"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(connection.webhookSecret, 'secret')}
            >
              {copied === 'secret' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button variant="outline" onClick={onRegenerateSecret}>
              重新生成
            </Button>
          </div>
        </div>

        {/* Langfuse 兼容配置 */}
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/30">
          <div className="mb-3">
            <h4 className="font-medium text-orange-900 dark:text-orange-200 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-orange-200 text-orange-700 text-xs font-bold">LF</span>
              Langfuse 兼容模式配置
            </h4>
            <p className="text-sm text-orange-800 dark:text-orange-300 mt-1">
              如果您在 Dify 的「追踪」页面选择 <strong>Langfuse</strong>，请使用以下配置：
            </p>
          </div>
          
          <div className="grid gap-3 sm:grid-cols-3">
             <div className="space-y-1">
               <label className="text-xs font-medium text-orange-800/80">Host 地址</label>
               <div className="relative">
                 <Input 
                   value={typeof window !== 'undefined' ? window.location.origin : ''} 
                   readOnly 
                   className="h-8 text-xs font-mono bg-white dark:bg-black/20"
                 />
                 <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-8 w-8"
                    onClick={() => copyToClipboard(typeof window !== 'undefined' ? window.location.origin : '', 'lf-host')}
                  >
                   {copied === 'lf-host' ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  </Button>
               </div>
             </div>
             <div className="space-y-1">
               <label className="text-xs font-medium text-orange-800/80">Public Key</label>
               <div className="relative">
                 <Input value="pk-simplefuse" readOnly className="h-8 text-xs font-mono bg-white dark:bg-black/20" />
                 <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-8 w-8"
                    onClick={() => copyToClipboard('pk-simplefuse', 'lf-pk')}
                  >
                   {copied === 'lf-pk' ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  </Button>
               </div>
             </div>
             <div className="space-y-1">
               <label className="text-xs font-medium text-orange-800/80">Secret Key</label>
               <div className="relative">
                 <Input value="sk-simplefuse" readOnly className="h-8 text-xs font-mono bg-white dark:bg-black/20" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-8 w-8"
                    onClick={() => copyToClipboard('sk-simplefuse', 'lf-sk')}
                  >
                   {copied === 'lf-sk' ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  </Button>
               </div>
             </div>
          </div>
        </div>

        {/* 工作流列表 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">已同步工作流</label>
            <span className="text-xs text-muted-foreground">
              最后同步: {connection.lastSyncAt || '从未同步'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {connection.workflows?.map((wf: any) => (
              <Badge key={wf.id} variant="secondary">
                {wf.name}
              </Badge>
            ))}
            {(!connection.workflows || connection.workflows.length === 0) && (
              <span className="text-sm text-muted-foreground">暂无同步的工作流</span>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onTest} disabled={isTestLoading}>
            {isTestLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            测试连接
          </Button>
          <Button variant="outline" onClick={onSync} disabled={isSyncLoading}>
            {isSyncLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            同步工作流
          </Button>
          <Button variant="destructive" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DifySettingsPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    difyUrl: '',
    apiKey: '',
  })
  const [testingId, setTestingId] = useState<string | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)

  const utils = trpc.useUtils()
  
  // 查询连接列表
  const { data, isLoading: isLoadingList } = trpc.difyConnections.list.useQuery({ 
    projectId: 'default' 
  })

  // Mutations
  const createMutation = trpc.difyConnections.create.useMutation({
    onSuccess: () => {
      toast.success('连接创建成功')
      utils.difyConnections.list.invalidate()
      setShowCreate(false)
      setFormData({ name: '', difyUrl: '', apiKey: '' })
    },
    onError: (err) => toast.error(`创建失败: ${err.message}`)
  })

  const deleteMutation = trpc.difyConnections.delete.useMutation({
    onSuccess: () => {
      toast.success('连接已删除')
      utils.difyConnections.list.invalidate()
    },
    onError: (err) => toast.error(`删除失败: ${err.message}`)
  })

  const testMutation = trpc.difyConnections.testConnection.useMutation()
  
  const syncMutation = trpc.difyConnections.syncWorkflows.useMutation({
    onSuccess: () => {
      toast.success('工作流同步成功')
      utils.difyConnections.list.invalidate()
      setSyncingId(null)
    },
    onError: (err) => {
      toast.error(`同步失败: ${err.message}`)
      setSyncingId(null)
    }
  })
  
  const regenerateSecretMutation = trpc.difyConnections.regenerateWebhookSecret.useMutation({
    onSuccess: () => {
      toast.success('Secret 已更新')
      utils.difyConnections.list.invalidate()
    },
    onError: (err) => toast.error(`更新失败: ${err.message}`)
  })

  const updateStatusMutation = trpc.difyConnections.updateStatus.useMutation({
    onSuccess: () => utils.difyConnections.list.invalidate()
  })

  // Handlers
  const handleCreate = () => {
    createMutation.mutate({
      projectId: 'default',
      ...formData
    })
  }

  const handleTest = async (id: string) => {
    setTestingId(id)
    try {
      const result = await testMutation.mutateAsync({ id })
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (err: any) {
      toast.error(`测试失败: ${err.message}`)
    }
    setTestingId(null)
  }

  const handleSync = (id: string) => {
    setSyncingId(id)
    syncMutation.mutate({ id })
  }

  const handleToggle = (id: string, active: boolean) => {
    updateStatusMutation.mutate({ id, isActive: active })
  }

  const handleRegenerateSecret = (id: string) => {
    regenerateSecretMutation.mutate({ id })
  }

  const handleDelete = (id: string) => {
    if (confirm('确定要删除此连接吗？')) {
      deleteMutation.mutate({ id })
    }
  }

  const connections = (data?.connections || []) as DifyConnection[]

  if (isLoadingList) {
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
          { label: 'Dify 集成' }
        ]}
        backHref="/"
      />

      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dify 集成</h1>
          <p className="text-muted-foreground">
            配置 Dify 连接，接收 Trace 数据
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          添加连接
        </Button>
      </div>

      {/* 连接列表 */}
      {connections.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Workflow className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">暂无 Dify 连接</h3>
            <p className="text-muted-foreground text-center mb-4">
              添加 Dify 连接以开始接收 Trace 数据
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              添加连接
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {connections.map(conn => (
            <ConnectionCard
              key={conn.id}
              connection={conn}
              onTest={() => handleTest(conn.id)}
              onSync={() => handleSync(conn.id)}
              onToggle={(active) => handleToggle(conn.id, active)}
              onRegenerateSecret={() => handleRegenerateSecret(conn.id)}
              onDelete={() => handleDelete(conn.id)}
              isTestLoading={testingId === conn.id}
              isSyncLoading={syncingId === conn.id}
            />
          ))}
        </div>
      )}

      {/* 创建连接弹窗 */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加 Dify 连接</DialogTitle>
            <DialogDescription>
              配置 Dify 服务器地址和 API Key
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">连接名称</label>
              <Input
                placeholder="例如: 生产环境 Dify"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Dify 服务地址</label>
              <Input
                placeholder="https://dify.example.com"
                value={formData.difyUrl}
                onChange={(e) => setFormData({ ...formData, difyUrl: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">API Key</label>
              <Input
                type="password"
                placeholder="输入 Dify API Key"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              取消
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={!formData.name || !formData.difyUrl || !formData.apiKey || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
