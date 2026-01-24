import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  TestTube2,
  TrendingUp,
  Clock,
  ArrowRight,
  Zap,
} from "lucide-react";

// 统计卡片数据
const stats = [
  {
    title: "总 Traces",
    value: "0",
    change: "+0%",
    icon: Activity,
    description: "本周新增",
  },
  {
    title: "评测次数",
    value: "0",
    change: "+0%",
    icon: TestTube2,
    description: "本周完成",
  },
  {
    title: "平均评分",
    value: "-",
    change: "0%",
    icon: TrendingUp,
    description: "相比上周",
  },
  {
    title: "平均延迟",
    value: "-",
    change: "0%",
    icon: Clock,
    description: "相比上周",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">仪表盘</h1>
          <p className="text-muted-foreground">
            欢迎使用 SimpleFuse，开始配置您的 LLM 评测工作流
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Zap className="h-3 w-3" />
          开发版本
        </Badge>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="glass">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-primary">{stat.change}</span> {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 快速开始 */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>快速开始</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-dashed p-4 text-center">
              <div className="mb-2 flex justify-center">
                <div className="rounded-full bg-primary/10 p-3">
                  <Activity className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="font-medium">1. 连接 Dify</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                配置 Dify 连接以接收 Traces
              </p>
              <Button variant="link" className="mt-2 gap-1" size="sm">
                前往设置 <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-lg border border-dashed p-4 text-center">
              <div className="mb-2 flex justify-center">
                <div className="rounded-full bg-primary/10 p-3">
                  <TestTube2 className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="font-medium">2. 配置评测器</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                选择或自定义评测维度
              </p>
              <Button variant="link" className="mt-2 gap-1" size="sm">
                查看评测器 <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-lg border border-dashed p-4 text-center">
              <div className="mb-2 flex justify-center">
                <div className="rounded-full bg-primary/10 p-3">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="font-medium">3. 运行评测</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                对 Traces 执行自动化评测
              </p>
              <Button variant="link" className="mt-2 gap-1" size="sm">
                评测中心 <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 最近活动 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">最近 Traces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              暂无数据，请先连接 Dify
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">最近评测</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              暂无数据，请先运行评测
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
