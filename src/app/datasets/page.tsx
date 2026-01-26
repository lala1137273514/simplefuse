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
  Plus, 
  Database,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  FileText,
  Search,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc-client'
import { toast } from 'sonner'

interface Dataset {
  id: string
  name: string
  description: string | null
  itemCount: number
  createdAt: string
}

function DatasetCard({ dataset, onView, onEdit, onDelete }: {
  dataset: Dataset
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <Card className="glass group hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Link href={`/evaluation-center?datasetId=${dataset.id}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            {/* 编辑功能暂未实现 */}
            {/* <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button> */}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardTitle className="text-base mt-2">{dataset.name}</CardTitle>
        <CardDescription className="line-clamp-2">
          {dataset.description || '暂无描述'}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            {dataset.itemCount} 条目
          </div>
          <span>{new Date(dataset.createdAt).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DatasetsPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  // 创建表单状态
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  const utils = trpc.useUtils()

  // 查询评测集列表
  const { data, isLoading, isFetching } = trpc.datasets.list.useQuery({
    projectId: 'default',
    limit: 100,
  })

  // 创建评测集 mutation
  const createMutation = trpc.datasets.create.useMutation({
    onSuccess: () => {
      toast.success('评测集创建成功')
      setShowCreate(false)
      setFormData({ name: '', description: '' })
      utils.datasets.list.invalidate()
    },
    onError: (err) => {
      toast.error(`创建失败: ${err.message}`)
    },
  })

  // 删除评测集 mutation
  const deleteMutation = trpc.datasets.delete.useMutation({
    onSuccess: () => {
      toast.success('评测集已删除')
      utils.datasets.list.invalidate()
    },
    onError: (err) => {
      toast.error(`删除失败: ${err.message}`)
    },
  })

  const handleRefresh = () => {
    utils.datasets.list.invalidate()
  }

  const handleDelete = (dataset: Dataset) => {
    if (confirm(`确定要删除评测集 "${dataset.name}" 吗？此操作不可逆。`)) {
      deleteMutation.mutate({ id: dataset.id })
    }
  }

  const handleCreate = () => {
    if (!formData.name.trim()) return

    createMutation.mutate({
      projectId: 'default',
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
    })
  }

  // 过滤数据集
  // 这里由于数据量不大，我们做客户端过滤
  // 实际生产中如果数据量大应该在服务端做搜索
  const datasets = data?.datasets || []
  const filteredDatasets = datasets.filter((d: Dataset) => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">评测集</h1>
          <p className="text-muted-foreground">
            管理评测数据集，用于批量评测和回归测试
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            创建评测集
          </Button>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索评测集..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* 评测集列表 */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredDatasets.length === 0 ? (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Database className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">
              {searchQuery ? '未找到匹配的评测集' : '暂无评测集'}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery ? '尝试其他搜索词' : '创建评测集以开始批量评测'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                创建评测集
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDatasets.map((dataset: Dataset) => (
            <DatasetCard
              key={dataset.id}
              dataset={dataset as Dataset}
              onView={() => {}} // 详情查看在 Link 中实现
              onEdit={() => {}} // 暂未实现
              onDelete={() => handleDelete(dataset as Dataset)}
            />
          ))}
        </div>
      )}

      {/* 创建评测集弹窗 */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建评测集</DialogTitle>
            <DialogDescription>
              创建新的评测数据集，用于存储测试数据
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">名称</label>
              <Input
                placeholder="例如: 客服对话评测集"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">描述</label>
              <Input
                placeholder="简要描述此评测集的用途"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={!formData.name || createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
