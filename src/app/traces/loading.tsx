'use client'

import { Card, CardContent } from '@/components/ui/card'

function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`animate-pulse bg-muted rounded ${className}`} />
}

export default function Loading() {
    return (
        <div className="space-y-6">
            {/* 页面标题骨架 */}
            <div className="flex items-center justify-between">
                <div>
                    <Skeleton className="h-8 w-24 mb-2" />
                    <Skeleton className="h-4 w-40" />
                </div>
                <Skeleton className="h-10 w-20" />
            </div>

            {/* 筛选器骨架 */}
            <Card className="glass">
                <CardContent className="pt-4">
                    <div className="flex gap-4">
                        <Skeleton className="h-10 flex-1" />
                        <Skeleton className="h-10 w-32" />
                    </div>
                </CardContent>
            </Card>

            {/* 表格骨架 */}
            <Card className="glass">
                <CardContent className="p-0">
                    <div className="p-4">
                        {/* 表头 */}
                        <div className="flex gap-4 border-b pb-3 mb-4">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                        {/* 表格行 */}
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                            <div key={i} className="flex gap-4 py-3 border-b border-muted/50">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-5 w-24" />
                                <Skeleton className="h-5 w-16" />
                                <Skeleton className="h-5 w-12" />
                                <Skeleton className="h-5 w-12" />
                                <Skeleton className="h-5 w-28" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* 分页骨架 */}
            <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                </div>
            </div>
        </div>
    )
}
