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
                    <Skeleton className="h-8 w-32 mb-2" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-10" />
                </div>
            </div>

            {/* 统计卡片骨架 */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="glass">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-8 w-8 rounded-lg" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-24" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* 图表骨架 */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="glass">
                    <CardHeader>
                        <Skeleton className="h-5 w-24" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-[300px] w-full" />
                    </CardContent>
                </Card>
                <Card className="glass">
                    <CardHeader>
                        <Skeleton className="h-5 w-24" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-[300px] w-full" />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
