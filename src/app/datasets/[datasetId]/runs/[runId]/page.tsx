'use client'

import { use } from 'react'
import { trpc } from '@/lib/trpc-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react'

interface PageProps {
  params: Promise<{ datasetId: string; runId: string }>
}

export default function DatasetRunDetailPage({ params }: PageProps) {
  const { datasetId, runId } = use(params)

  const { data: run, isLoading } = trpc.datasetRuns.getById.useQuery({ id: runId })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!run) {
    return <div>运行记录不存在</div>
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: '评测集', href: '/datasets' },
          { label: '运行记录', href: `/datasets/${datasetId}/runs` },
          { label: run.name || `运行 #${run.id.slice(0, 8)}` }
        ]}
        backHref={`/datasets/${datasetId}/runs`}
      />

      <div>
        <h1 className="text-2xl font-bold">
          {run.name || `运行 #${run.id.slice(0, 8)}`}
        </h1>
        <p className="text-muted-foreground">
          {new Date(run.createdAt).toLocaleString('zh-CN')}
        </p>
      </div>

      {/* 运行项列表 */}
      <div className="space-y-4">
        {run.items.map((item, index) => (
          <Card key={item.id} className="glass">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  #{index + 1} {item.datasetItem?.input ? '...' : '未知输入'}
                </CardTitle>
                {item.error ? (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    失败
                  </Badge>
                ) : (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    成功
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">期望输出</h4>
                  <pre className="bg-muted/50 rounded p-3 text-sm overflow-auto max-h-32">
                    {item.expectedOutput ? JSON.stringify(item.expectedOutput, null, 2) : '-'}
                  </pre>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">实际输出</h4>
                  <pre className="bg-muted/50 rounded p-3 text-sm overflow-auto max-h-32">
                    {item.output ? JSON.stringify(item.output, null, 2) : '-'}
                  </pre>
                </div>
              </div>

              {item.error && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-600 dark:text-red-400">
                  {item.error}
                </div>
              )}

              <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
                {item.latencyMs && <span>延迟: {item.latencyMs}ms</span>}
                {item.totalTokens && <span>Tokens: {item.totalTokens}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
