'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import React, { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import superjson from 'superjson'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,       // 数据有效期 5 分钟
        gcTime: 1000 * 60 * 30,         // 缓存保留 30 分钟
        refetchOnWindowFocus: false,    // 窗口聚焦时不自动刷新
        retry: 1,                       // 失败后只重试 1 次
      },
    },
  }))
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          transformer: superjson,
        }),
      ],
    })
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  )
}
