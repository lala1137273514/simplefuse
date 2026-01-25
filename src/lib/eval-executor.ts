/**
 * 评测执行器 - 同步执行 LLM 评测
 * 
 * Phase 9.1: 将评测从异步队列改为同步执行
 */

import { createProviderFromDbConfig } from '@/lib/llm/providers'
import prisma from '@/lib/prisma'
import { insertScore } from '@/lib/clickhouse'

export interface EvalTaskData {
  traceId: string
  traceInput: string
  traceOutput: string
  evaluatorId: string
  evaluatorName: string
  promptTemplate: string
  projectId: string
  evalJobId: string  // 关联的评测任务 ID
}

export interface EvalResult {
  traceId: string
  evaluatorId: string
  evaluatorName: string
  score: number
  reason: string
  success: boolean
  error?: string
}

/**
 * 执行单个评测任务
 */
export async function executeEvaluation(
  task: EvalTaskData,
  llmConfigId: string
): Promise<EvalResult> {
  try {
    // 1. 获取 LLM 配置
    const llmConfig = await prisma.llmConfig.findUnique({
      where: { id: llmConfigId },
    })

    if (!llmConfig) {
      return {
        traceId: task.traceId,
        evaluatorId: task.evaluatorId,
        evaluatorName: task.evaluatorName,
        score: 0,
        reason: 'LLM configuration not found',
        success: false,
        error: 'LLM configuration not found',
      }
    }

    // 2. 创建 LLM Provider
    const provider = createProviderFromDbConfig({
      provider: llmConfig.provider,
      modelName: llmConfig.modelName,
      apiKeyEncrypted: llmConfig.apiKeyEncrypted,
      apiEndpoint: llmConfig.apiEndpoint,
      config: llmConfig.config,
    })

    // 3. 构建评测 Prompt
    const evaluationPrompt = buildEvaluationPrompt(
      task.promptTemplate,
      task.traceInput,
      task.traceOutput
    )

    // 4. 调用 LLM
    const response = await provider.chat({
      messages: [
        {
          role: 'system',
          content: `你是一个专业的 AI 评测员。请根据给定的评测标准对 AI 回复进行评分。

严格要求：
1. 只返回纯 JSON 对象，格式为: {"score": 0-10的数字, "reason": "详细评分理由"}
2. 不要使用 Markdown 代码块（不要用 \`\`\`）
3. 不要添加任何其他文字说明
4. reason 字段必须包含 20 字以上的详细理由`,
        },
        {
          role: 'user',
          content: evaluationPrompt,
        },
      ],
      temperature: 0.1, // 低温度以获得更稳定的评分
      maxTokens: 512,  // 增加 token 限制避免截断
    })

    // 5. 解析 LLM 响应
    const { score, reason } = parseEvalResponse(response.content)

    // 6. 写入 ClickHouse
    await insertScore({
      id: `score-${task.traceId}-${task.evaluatorId}-${Date.now()}`,
      project_id: task.projectId,
      trace_id: task.traceId,
      evaluator_id: task.evaluatorId,
      evaluator_name: task.evaluatorName,
      score,
      reason,
      eval_job_id: task.evalJobId,  // 关联评测任务
      created_at: new Date().toISOString(),
    })

    return {
      traceId: task.traceId,
      evaluatorId: task.evaluatorId,
      evaluatorName: task.evaluatorName,
      score,
      reason,
      success: true,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      traceId: task.traceId,
      evaluatorId: task.evaluatorId,
      evaluatorName: task.evaluatorName,
      score: 0,
      reason: errorMessage,
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * 批量执行评测任务
 */
export async function executeEvaluationBatch(
  tasks: EvalTaskData[],
  llmConfigId: string,
  onProgress?: (completed: number, total: number) => void
): Promise<{ results: EvalResult[]; successCount: number; failedCount: number }> {
  const results: EvalResult[] = []
  let successCount = 0
  let failedCount = 0

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]
    const result = await executeEvaluation(task, llmConfigId)
    results.push(result)

    if (result.success) {
      successCount++
    } else {
      failedCount++
    }

    if (onProgress) {
      onProgress(i + 1, tasks.length)
    }
  }

  return { results, successCount, failedCount }
}

/**
 * 构建评测 Prompt
 */
function buildEvaluationPrompt(
  template: string,
  input: string,
  output: string
): string {
  // 替换模板中的占位符
  let prompt = template
    .replace(/\{\{input\}\}/g, input)
    .replace(/\{\{output\}\}/g, output)
    .replace(/\{\{user_input\}\}/g, input)
    .replace(/\{\{ai_response\}\}/g, output)
    .replace(/\{\{response\}\}/g, output)

  // 如果模板没有占位符，追加输入输出
  if (!template.includes('{{')) {
    prompt = `${template}

用户输入: ${input}

AI 回复: ${output}`
  }

  return prompt
}

/**
 * 解析 LLM 评测响应
 */
function parseEvalResponse(content: string): { score: number; reason: string } {
  const cleaned = content.trim()
  
  try {
    // 提取 JSON 部分（可能被包裹在 markdown 代码块中）
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        score: Math.min(10, Math.max(0, Number(parsed.score) || 0)),
        reason: String(parsed.reason || parsed.reasoning || '无评测理由'),
      }
    }
  } catch {
    // JSON 解析失败，尝试容错处理
  }
  
  // 容错处理：尝试从不完整的 JSON 或文本中提取信息
  let score = 5
  let reason = ''
  
  // 1. 尝试提取 score 字段值
  const scoreMatch = cleaned.match(/"score"\s*:\s*(\d+(?:\.\d+)?)/i)
  if (scoreMatch) {
    score = Math.min(10, Math.max(0, Number(scoreMatch[1])))
  } else {
    // 尝试匹配独立的数字（如 "8分" 或 "评分: 8"）
    const numMatch = cleaned.match(/(?:评分|score|分数)[:\s]*(\d+(?:\.\d+)?)/i) 
                  || cleaned.match(/(\d+(?:\.\d+)?)\s*分/)
    if (numMatch) {
      score = Math.min(10, Math.max(0, Number(numMatch[1])))
    }
  }
  
  // 2. 尝试提取 reason 字段值
  const reasonMatch = cleaned.match(/"(?:reason|reasoning)"\s*:\s*"([^"]*)/i)
  if (reasonMatch) {
    reason = reasonMatch[1] || '评测理由被截断'
  } else {
    // 尝试从文本中提取理由（排除 JSON 结构）
    const textReason = cleaned.replace(/[{}"]/g, '').replace(/score\s*:\s*\d+/gi, '').trim()
    reason = textReason.slice(0, 200) || '无法解析评测理由'
  }
  
  return { score, reason }
}
