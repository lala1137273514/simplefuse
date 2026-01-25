/**
 * 评测任务队列
 * 
 * 使用 BullMQ + Redis 实现异步评测任务
 */

import { Queue, Worker, Job } from 'bullmq'
import IORedis from 'ioredis'
import { createProviderFromDbConfig } from '@/lib/llm'
import prisma from '@/lib/prisma'
import { getClickHouseClient } from '@/lib/clickhouse'
import { v4 as uuidv4 } from 'uuid'

// Redis 连接
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

// 队列名称
const EVALUATION_QUEUE = 'evaluation'

/**
 * 评测任务类型
 */
export interface EvaluationTaskData {
  jobId: string           // EvalJob ID (PostgreSQL)
  projectId: string
  traceId: string         // 要评测的 Trace ID
  traceInput: string      // Trace 输入
  traceOutput: string     // Trace 输出
  evaluatorId: string     // 评测器 ID
  evaluatorName: string
  promptTemplate: string  // 评测 Prompt 模板
  llmConfigId: string     // LLM 配置 ID
}

/**
 * 评测结果类型
 */
export interface EvaluationResult {
  score: number
  reasoning: string
  error?: string
}

/**
 * 创建评测任务队列
 */
export const evaluationQueue = new Queue<EvaluationTaskData>(EVALUATION_QUEUE, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 100,
  },
})

/**
 * 渲染 Prompt 模板
 * 将 {{input}} 和 {{output}} 替换为实际值
 */
function renderPromptTemplate(template: string, input: string, output: string): string {
  return template
    .replace(/\{\{input\}\}/g, input)
    .replace(/\{\{output\}\}/g, output)
}

/**
 * 解析 LLM 返回的评测结果
 */
function parseEvaluationResult(content: string): EvaluationResult {
  try {
    // 尝试从返回内容中提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    
    const result = JSON.parse(jsonMatch[0])
    
    return {
      score: typeof result.score === 'number' ? result.score : parseFloat(result.score) || 0,
      reasoning: result.reasoning || '',
    }
  } catch (error) {
    return {
      score: 0,
      reasoning: '',
      error: `Failed to parse result: ${error}`,
    }
  }
}

/**
 * 写入评测结果到 ClickHouse
 */
async function writeScoreToClickHouse(data: {
  traceId: string
  projectId: string
  evaluatorId: string
  evaluatorName: string
  score: number
  reasoning: string
  evalJobId: string
}) {
  const client = getClickHouseClient()
  const now = new Date().toISOString().replace('T', ' ').slice(0, -1)
  
  await client.insert({
    table: 'scores',
    values: [{
      id: uuidv4(),
      trace_id: data.traceId,
      observation_id: null,
      project_id: data.projectId,
      evaluator_id: data.evaluatorId,
      evaluator_name: data.evaluatorName,
      score: data.score,
      reasoning: data.reasoning,
      source: 'llm',
      data_type: 'numeric',
      string_value: null,
      eval_job_id: data.evalJobId,
      timestamp: now,
      event_ts: now,
      is_deleted: 0,
    }],
    format: 'JSONEachRow',
  })
}

/**
 * 评测任务处理器
 */
async function processEvaluationTask(job: Job<EvaluationTaskData>): Promise<EvaluationResult> {
  const { data } = job
  
  try {
    // 1. 获取 LLM 配置
    const llmConfig = await prisma.llmConfig.findUnique({
      where: { id: data.llmConfigId },
    })
    
    if (!llmConfig) {
      throw new Error(`LLM config not found: ${data.llmConfigId}`)
    }
    
    // 2. 创建 LLM Provider
    const provider = createProviderFromDbConfig({
      provider: llmConfig.provider,
      modelName: llmConfig.modelName,
      apiKeyEncrypted: llmConfig.apiKeyEncrypted,
      apiEndpoint: llmConfig.apiEndpoint,
      config: llmConfig.config,
    })
    
    // 3. 渲染 Prompt
    const prompt = renderPromptTemplate(
      data.promptTemplate,
      data.traceInput,
      data.traceOutput
    )
    
    // 4. 调用 LLM
    const response = await provider.chat({
      messages: [
        { role: 'user', content: prompt },
      ],
      temperature: 0.3, // 评测使用较低温度以获得更一致的结果
      maxTokens: 512,
    })
    
    // 5. 解析结果
    const result = parseEvaluationResult(response.content)
    
    // 6. 写入 ClickHouse
    if (!result.error) {
      await writeScoreToClickHouse({
        traceId: data.traceId,
        projectId: data.projectId,
        evaluatorId: data.evaluatorId,
        evaluatorName: data.evaluatorName,
        score: result.score,
        reasoning: result.reasoning,
        evalJobId: data.jobId,
      })
    }
    
    // 7. 更新任务进度
    await prisma.evalJob.update({
      where: { id: data.jobId },
      data: {
        completedCount: { increment: 1 },
        ...(result.error ? { failedCount: { increment: 1 } } : {}),
      },
    })
    
    return result
    
  } catch (error) {
    // 更新失败计数
    await prisma.evalJob.update({
      where: { id: data.jobId },
      data: {
        failedCount: { increment: 1 },
      },
    })
    
    throw error
  }
}

/**
 * 创建 Worker (在服务器端调用)
 */
export function createEvaluationWorker() {
  const worker = new Worker<EvaluationTaskData>(
    EVALUATION_QUEUE,
    processEvaluationTask,
    {
      connection,
      concurrency: 5, // 同时处理 5 个任务
    }
  )
  
  worker.on('completed', (job, result) => {
    console.log(`✓ Evaluation job ${job.id} completed:`, result)
  })
  
  worker.on('failed', (job, error) => {
    console.error(`✗ Evaluation job ${job?.id} failed:`, error)
  })
  
  return worker
}

/**
 * 添加评测任务到队列
 */
export async function addEvaluationTask(data: EvaluationTaskData) {
  return evaluationQueue.add('evaluate', data)
}

/**
 * 批量添加评测任务
 */
export async function addEvaluationTasks(tasks: EvaluationTaskData[]) {
  return evaluationQueue.addBulk(
    tasks.map(data => ({
      name: 'evaluate',
      data,
    }))
  )
}

/**
 * 获取队列状态
 */
export async function getQueueStatus() {
  const [waiting, active, completed, failed] = await Promise.all([
    evaluationQueue.getWaitingCount(),
    evaluationQueue.getActiveCount(),
    evaluationQueue.getCompletedCount(),
    evaluationQueue.getFailedCount(),
  ])
  
  return { waiting, active, completed, failed }
}
