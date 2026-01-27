'use client'

import { use } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Badge } from '@/components/ui/badge'
import {
  History,
  ChevronRight,
  Calendar,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ datasetId: string }>
}

export default function DatasetRunsPage({ params }: PageProps) {
  const { datasetId } = use(params)

  const { data: dataset } = trpc.datasets.getById.useQuery({ id: datasetId })
  const { data: runs, isLoading } = trpc.datasetRuns.list.useQuery({ datasetId })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: '评测集', href: '/datasets' },
          { label: dataset?.name || '评测集' },
          { label: '运行记录' }
        ]}
        backHref="/datasets"
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6" />
            运行记录
          </h1>
          <p className="text-muted-foreground">
            {dataset?.name} 的历史运行记录
          </p>
        </div>
      </div>

      {runs && runs.length > 0 ? (
        <div className="grid gap-4">
          {runs.map((run) => (
            <Link key={run.id} href={`/datasets/${datasetId}/runs/${run.id}`}>
              <Card className="glass cursor-pointer hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {run.name || `运行 #${run.id.slice(0, 8)}`}
                    </CardTitle>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(run.createdAt).toLocaleString('zh-CN')}
                    </span>
                    <Badge variant="secondary">
                      {run._count?.items || 0} 项
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <History className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">暂无运行记录</h3>
            <p className="text-muted-foreground text-center">
              使用此评测集运行评测后，记录将显示在这里
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
