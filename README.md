# SimpleFuse

> 轻量级 LLM 观测与评测平台，专注于 Dify 集成

## 功能特性

- 🔗 **Dify 集成** - 通过 Webhook 或 Langfuse 兼容模式自动采集 Dify 工作流的请求与响应
- 📊 **Traces 管理** - 查看、筛选、搜索所有 LLM 调用记录
- 🧪 **LLM 评测** - 使用自定义评测器对 Traces 进行多维度评分
- 📈 **仪表盘** - 实时统计与趋势图表
- 🗂️ **评测集** - 管理用于评测的数据集
- 🔄 **Langfuse 兼容** - 支持 Dify Native Langfuse Integration


---

## 本地部署指南

### 1. 环境要求

- Node.js 18+
- Docker Desktop（用于运行数据库）
- Git

### 2. 克隆项目

```bash
git clone https://github.com/lala1137273514/simplefuse.git
cd simplefuse
```

### 3. 安装依赖

```bash
npm install
```

### 4. 启动数据库服务

确保 Docker Desktop 已启动，然后运行：

```bash
docker-compose up -d
```

这会启动以下服务：
| 服务 | 端口 | 说明 |
|------|------|------|
| PostgreSQL | 5432 | 业务数据存储 |
| ClickHouse | 8123/9000 | 分析数据存储 |
| Redis | 6379 | 缓存与队列 |

### 5. 配置环境变量

复制环境变量模板：

```bash
cp .env.example .env.local
```

默认配置适用于本地开发，无需修改。

### 6. 初始化数据库

```bash
# PostgreSQL 迁移
npx prisma migrate dev

# ClickHouse 表创建
npm run migrate:clickhouse
```

### 7. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 查看应用。

> ⚠️ **注意**: 如遇到 Turbopack 中文路径问题，项目已配置使用 Webpack

---

## 项目结构

```
simplefuse/
├── src/
│   ├── app/                 # Next.js App Router 页面
│   │   ├── dashboard/       # 仪表盘
│   │   ├── traces/          # Traces 管理
│   │   ├── evaluation-center/ # 评测中心
│   │   ├── evaluators/      # 评测器管理
│   │   ├── results/         # 评测结果
│   │   ├── datasets/        # 评测集
│   │   └── settings/        # 设置（Dify/LLM）
│   ├── server/              # tRPC API 路由
│   ├── lib/                 # 工具库
│   └── components/          # UI 组件
├── prisma/                  # PostgreSQL Schema
├── clickhouse/              # ClickHouse 迁移脚本
└── docker-compose.yml       # Docker 服务配置
```

---

## 环境变量说明

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/simplefuse` | PostgreSQL 连接 |
| `CLICKHOUSE_URL` | `http://localhost:8123` | ClickHouse HTTP 端口 |
| `REDIS_URL` | `redis://localhost:6379` | Redis 连接 |
| `ENCRYPTION_KEY` | (自动生成) | API Key 加密密钥 |

---

## 常用命令

```bash
# 开发
npm run dev              # 启动开发服务器
npm run build            # 构建生产版本
npm run start            # 启动生产服务器

# 数据库
npx prisma migrate dev   # 应用数据库迁移
npx prisma studio        # 可视化数据库管理
npm run migrate:clickhouse  # ClickHouse 迁移

# 测试
npm test                 # 运行单元测试
npm run lint             # 代码检查

# Docker
docker-compose up -d     # 启动服务
docker-compose down      # 停止服务
docker-compose logs -f   # 查看日志
```

---

## 快速开始

### 方式一：Langfuse 兼容模式（推荐）

1. **在 Dify 中配置** - 进入 应用 > 监控 > 追踪，选择 Langfuse
2. **填写配置**：
   - Host: `https://your-simplefuse-url` (你的 SimpleFuse 部署地址)
   - Public Key: `pk-simplefuse` (以 pk- 开头的任意字符串)
   - Secret Key: `sk-simplefuse` (任意字符串)
3. **测试连接** - 保存后 Dify 工作流调用会自动采集到 SimpleFuse

### 方式二：Webhook 模式

1. **配置 Dify 连接** - 进入 设置 > Dify 集成，添加 Dify 服务器和 API Key
2. **获取 Webhook URL** - 复制生成的 Webhook URL 到 Dify 中

### 通用步骤

3. **配置 LLM** - 进入 设置 > LLM 配置，添加评测用的 LLM（如 OpenAI、通义千问）
4. **查看 Traces** - 当 Dify 工作流被调用时，会自动采集到 Traces 页面
5. **创建评测器** - 进入 评测器管理，创建评测维度（如相关性、准确性等）
6. **运行评测** - 进入 评测中心，选择 Traces 和评测器，开始评测
7. **查看结果** - 评测完成后自动跳转到结果页，查看各维度评分


---

## 开发文档

详细的开发执行日志请参见 [DEVELOPMENT_LOG.md](./DEVELOPMENT_LOG.md)

---

## License

MIT
