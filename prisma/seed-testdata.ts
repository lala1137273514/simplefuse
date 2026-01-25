/**
 * 测试数据 Seed 脚本
 * 
 * 生成:
 * - 50 条 Trace (ClickHouse)
 * - 1 个评测集 (PostgreSQL)
 * - 评测结果 (ClickHouse)
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { createClient } from '@clickhouse/client'
import { v4 as uuidv4 } from 'uuid'

// 数据库连接
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/simplefuse'
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

// ClickHouse 连接
const clickhouse = createClient({
  url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
  database: process.env.CLICKHOUSE_DB || 'simplefuse',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
})

// 样例对话
const SAMPLE_CONVERSATIONS = [
  { input: '请问你们的退款政策是什么？', output: '您好！我们的退款政策如下：购买后7天内可无理由退款，15天内如有质量问题可申请换货或退款。超过15天仅支持换货。请保留好购物凭证。' },
  { input: '如何联系客服？', output: '您可以通过以下方式联系我们：1. 在线客服：点击页面右下角的聊天图标 2. 电话客服：400-123-4567（工作日9:00-18:00）3. 邮箱：support@example.com' },
  { input: '这个产品支持什么配送方式？', output: '我们支持以下配送方式：1. 顺丰快递（默认，2-3天送达）2. EMS（3-5天）3. 普通快递（5-7天）。全场满99元包邮，不满99元收取10元运费。' },
  { input: '产品有保修吗？', output: '是的，我们所有产品都享有一年质保服务。在保修期内，如因产品本身质量问题导致的故障，我们将免费维修或更换。人为损坏不在保修范围内。' },
  { input: '如何安装这个软件？', output: '安装步骤如下：1. 下载安装包 2. 双击运行安装程序 3. 按照向导提示完成安装 4. 重启电脑后即可使用。如遇问题可查看帮助文档或联系技术支持。' },
  { input: '支持哪些支付方式？', output: '我们支持多种支付方式：1. 微信支付 2. 支付宝 3. 银联卡 4. 信用卡（Visa/MasterCard）5. 分期付款（花呗、银行分期）。' },
  { input: '如何修改收货地址？', output: '修改收货地址的方法：1. 登录您的账户 2. 进入"我的订单" 3. 找到未发货的订单 4. 点击"修改地址"。注意：已发货订单无法修改地址。' },
  { input: '产品可以开发票吗？', output: '可以的，我们提供电子发票和纸质发票两种选择。下单时在备注中写明"需要发票"及发票抬头即可。电子发票会在发货后3个工作日内发送到您的邮箱。' },
  { input: '忘记密码怎么办？', output: '重置密码步骤：1. 点击登录页的"忘记密码" 2. 输入绑定手机号或邮箱 3. 获取验证码 4. 设置新密码。如有问题请联系客服协助处理。' },
  { input: '商品和图片不符怎么办？', output: '如果收到的商品与描述不符，请在签收后48小时内联系客服，提供商品照片作为凭证。经确认后，我们将为您安排退换货，运费由我们承担。' },
  { input: '请介绍一下会员权益', output: '会员权益包括：1. 专享折扣：全场95折 2. 积分加倍：消费积分翻倍 3. 优先发货 4. 专属客服 5. 会员日特惠 6. 生日礼包。年费99元，物超所值！' },
  { input: '如何取消订单？', output: '取消订单方法：进入"我的订单"，找到需要取消的订单，点击"取消订单"按钮。注意：已发货订单无法在线取消，需要联系客服处理。' },
  { input: '积分怎么使用？', output: '积分使用说明：100积分=1元，结算时可直接抵扣。最高可抵扣订单金额的20%。积分有效期为获取后12个月，请及时使用。' },
  { input: '如何评价商品？', output: '评价商品步骤：1. 确认收货后7天内 2. 进入"待评价"页面 3. 选择商品点击"评价" 4. 填写评语和星级 5. 可上传图片获得额外积分。' },
  { input: '商品缺货怎么办？', output: '遇到缺货可以：1. 加入"到货通知"，我们会第一时间短信通知您 2. 选择相似商品 3. 联系客服咨询预计补货时间。VIP用户可优先预订。' },
]

// 工作流名称
const WORKFLOW_NAMES = [
  '智能客服工作流',
  '知识库检索工作流',
  '意图分类工作流',
  '对话摘要工作流',
  '情感分析工作流',
]

// 评测器名称
const EVALUATOR_NAMES = [
  'Relevance (相关性)',
  'Accuracy (准确性)',
  'Coherence (连贯性)',
  'Completeness (完整性)',
  'Safety (安全性)',
]

/**
 * 生成随机时间戳（过去7天内）
 */
function randomTimestamp(daysAgo: number = 7): string {
  const now = Date.now()
  const past = now - Math.random() * daysAgo * 24 * 60 * 60 * 1000
  return new Date(past).toISOString()
}

/**
 * 生成随机分数
 */
function randomScore(min: number = 6, max: number = 10): number {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10
}

/**
 * 生成随机延迟
 */
function randomLatency(): number {
  // 大部分在100-1000ms之间
  return Math.floor(Math.random() * 900 + 100)
}

/**
 * 生成随机 Token 数
 */
function randomTokens(): number {
  return Math.floor(Math.random() * 2000 + 500)
}

async function main() {
  console.log('🚀 开始生成测试数据...\n')

  // 1. 确保默认项目存在
  let project = await prisma.project.findFirst({ where: { id: 'default' } })
  if (!project) {
    project = await prisma.project.create({
      data: {
        id: 'default',
        name: '默认项目',
        description: 'SimpleFuse 默认项目',
        apiKey: `sf_${Date.now()}`,
      },
    })
    console.log('✓ 创建默认项目')
  }

  // 2. 获取评测器
  const evaluators = await prisma.evaluatorTemplate.findMany({
    where: { isPreset: true, isActive: true },
    take: 5,
  })
  console.log(`✓ 获取 ${evaluators.length} 个评测器`)

  // 3. 生成 50 条 Traces
  console.log('\n📊 生成 50 条 Traces...')
  const traces: any[] = []

  for (let i = 0; i < 50; i++) {
    const conv = SAMPLE_CONVERSATIONS[i % SAMPLE_CONVERSATIONS.length]
    // convert to milliseconds for ClickHouse Date64
    const ts = new Date(randomTimestamp(7)).getTime()
    
    traces.push({
      id: uuidv4(),
      project_id: 'default',
      dify_connection_id: '',
      workflow_name: WORKFLOW_NAMES[Math.floor(Math.random() * WORKFLOW_NAMES.length)],
      name: `对话 #${i + 1}`,
      timestamp: ts,
      user_id: `user-${Math.floor(Math.random() * 10)}`,
      session_id: `session-${Math.floor(Math.random() * 20)}`,
      input: conv.input,
      output: conv.output,
      metadata: {},
      tags: [],
      total_tokens: randomTokens(),
      latency_ms: randomLatency(),
      status: Math.random() > 0.05 ? 'success' : 'error',
      created_at: ts,
      event_ts: ts,
      is_deleted: 0,
    })
  }

  // 插入到 ClickHouse
  try {
    await clickhouse.insert({
      table: 'traces',
      values: traces,
      format: 'JSONEachRow',
    })
    console.log(`✓ 插入 50 条 Traces 到 ClickHouse`)
  } catch (e) {
    console.error('插入 Traces 失败:', e)
    throw e
  }

  // 4. 生成评测结果
  console.log('\n📈 生成评测结果...')
  const scores: any[] = []

  for (const trace of traces) {
    const selectedEvaluators = evaluators
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)

    for (const ev of selectedEvaluators) {
      const score = randomScore(6, 10)
      const reasonings = [
        `回复质量${score >= 8 ? '很高' : '良好'}，${score >= 8 ? '准确地' : '基本'}回答了用户的问题。`,
        `内容${score >= 8 ? '结构清晰，表达流畅' : '基本完整，有待改进'}。`,
        `信息${score >= 8 ? '准确详尽' : '基本准确'}，${score >= 8 ? '给出了具体建议' : '可补充更多细节'}。`,
      ]

      scores.push({
        id: uuidv4(),
        trace_id: trace.id,
        observation_id: null,
        project_id: 'default',
        evaluator_id: ev.id,
        evaluator_name: ev.name,
        score: score,
        reasoning: reasonings[Math.floor(Math.random() * reasonings.length)],
        source: 'auto',
        data_type: 'numeric',
        string_value: null,
        eval_job_id: null,
        timestamp: trace.timestamp,
        created_at: trace.created_at,
        event_ts: trace.event_ts,
        is_deleted: 0,
      })
    }
  }

  try {
    await clickhouse.insert({
      table: 'scores',
      values: scores,
      format: 'JSONEachRow',
    })
    console.log(`✓ 插入 ${scores.length} 条评测结果到 ClickHouse`)
  } catch (e) {
    console.error('插入 Scores 失败:', e)
    throw e
  }

  // 5. 创建评测集
  console.log('\n📁 创建评测集...')
  const existingDataset = await prisma.dataset.findFirst({
    where: { name: '客服对话测试集' },
  })

  if (!existingDataset) {
    const dataset = await prisma.dataset.create({
      data: {
        projectId: 'default',
        name: '客服对话测试集',
        description: '用于测试客服AI回复质量的样本数据集',
      },
    })

    // 添加 10 条评测集项目
    for (let i = 0; i < 10; i++) {
      const conv = SAMPLE_CONVERSATIONS[i]
      await prisma.datasetItem.create({
        data: {
          datasetId: dataset.id,
          traceId: traces[i].id,
          input: { question: conv.input },
          expectedOutput: { answer: conv.output },
        },
      })
    }
    console.log('✓ 创建评测集: 客服对话测试集 (10 条样本)')
  } else {
    console.log('✓ 评测集已存在')
  }

  // 6. 创建一个评测任务 (已完成状态)
  console.log('\n🔄 创建评测任务...')
  const existingJob = await prisma.evalJob.findFirst({
    where: { name: '示例评测任务' },
  })

  if (!existingJob) {
    await prisma.evalJob.create({
      data: {
        projectId: 'default',
        name: '示例评测任务',
        sourceType: 'traces',
        status: 'completed',
        totalCount: 150,
        completedCount: 150,
        failedCount: 0,
        startedAt: new Date(Date.now() - 3600000),
        completedAt: new Date(),
      },
    })
    console.log('✓ 创建示例评测任务')
  }

  console.log('\n✅ 测试数据生成完成!')
  console.log('   - 50 条 Traces')
  console.log('   - 150 条评测结果')
  console.log('   - 1 个评测集 (10 条样本)')
  console.log('   - 1 个评测任务')
}

main()
  .catch((e) => {
    console.error('❌ 生成失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await clickhouse.close()
  })
