'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'

function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`animate-pulse bg-muted rounded ${className}`} />
}

export default function Loading() {
    return (
        <div className="space-y-6">
            {/* 页面标题骨架 */}
            <div className="flex items-center justify-between">
                <div>
                    <Skeleton className="h-8 w-28 mb-2" />
                    <Skeleton className="h-4 w-56" />
                </div>
            </div>

            {/* 三列布局骨架 */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* 数据源选择 */}
                <Card className="glass">
                    <CardHeader>
                        <Skeleton className="h-5 w-20" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center gap-3">
                                <Skeleton className="h-4 w-4" />
                                <Skeleton className="h-4 flex-1" />
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* 评测器选择 */}
                <Card className="glass">
                    <CardHeader>
                        <Skeleton className="h-5 w-20" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center gap-3">
                                <Skeleton className="h-4 w-4" />
                                <Skeleton className="h-4 flex-1" />
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* LLM 选择 */}
                <Card className="glass">
                    <CardHeader>
                        <Skeleton className="h-5 w-24" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-10 w-full mb-4" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
            </div>

            {/* 任务历史骨架 */}
            <Card className="glass">
                <CardHeader>
                    <Skeleton className="h-5 w-24" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                    <div>
                                        <Skeleton className="h-4 w-32 mb-1" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                </div>
                                <Skeleton className="h-6 w-16" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
