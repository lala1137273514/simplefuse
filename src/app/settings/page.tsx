'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Workflow,
  Cpu,
  Key,
  Bell,
  Shield,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'

const settingsItems = [
  {
    title: 'Dify 集成',
    description: '管理 Dify 连接，配置 Webhook 接收 Trace 数据',
    icon: Workflow,
    href: '/settings/dify',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    title: 'LLM 配置',
    description: '配置评测使用的 LLM 模型，支持多种 Provider',
    icon: Cpu,
    href: '/settings/llm',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    title: 'API 密钥',
    description: '管理 SimpleFuse API 密钥',
    icon: Key,
    href: '/settings/api-keys',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    comingSoon: true,
  },
  {
    title: '通知设置',
    description: '配置评测完成通知方式',
    icon: Bell,
    href: '/settings/notifications',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    comingSoon: true,
  },
  {
    title: '安全设置',
    description: '账户安全和访问控制',
    icon: Shield,
    href: '/settings/security',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    comingSoon: true,
  },
]

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold">设置</h1>
        <p className="text-muted-foreground">
          配置 SimpleFuse 各项功能
        </p>
      </div>

      {/* 设置项列表 */}
      <div className="grid gap-4 md:grid-cols-2">
        {settingsItems.map((item) => (
          <Link 
            key={item.title} 
            href={item.comingSoon ? '#' : item.href}
            className={item.comingSoon ? 'cursor-not-allowed' : ''}
          >
            <Card className={`glass h-full hover:border-primary/50 transition-colors ${item.comingSoon ? 'opacity-60' : ''}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.bgColor}`}>
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    {item.comingSoon && (
                      <span className="text-xs text-muted-foreground">即将推出</span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <CardTitle className="text-base mt-3">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {/* 版本信息 */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">关于 SimpleFuse</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>版本: 0.1.0 (开发版)</p>
          <p>基于 Next.js 16 + tRPC + ClickHouse 构建</p>
          <p>© 2026 SimpleFuse Team</p>
        </CardContent>
      </Card>
    </div>
  )
}
