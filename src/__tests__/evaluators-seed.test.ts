/**
 * 评测器 Seed 测试 - TDD RED Phase
 * 
 * 验证预置评测器数据完整性
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// Prisma 7 使用 driver adapter 模式
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/simplefuse'
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

// 8 个预置评测维度
const PRESET_EVALUATORS = [
  'relevance',    // 相关性
  'accuracy',     // 准确性
  'coherence',    // 连贯性
  'completeness', // 完整性
  'conciseness',  // 简洁性
  'safety',       // 安全性
  'tone',         // 语气适当性
  'creativity',   // 创造性
] as const

describe('预置评测器 Seed 数据', () => {
  beforeAll(async () => {
    await prisma.$connect()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('应该存在 8 个预置评测器', async () => {
    const presetEvaluators = await prisma.evaluatorTemplate.findMany({
      where: { isPreset: true },
    })

    expect(presetEvaluators.length).toBe(8)
  })

  it('每个预置评测器应该有完整的 promptTemplate', async () => {
    const presetEvaluators = await prisma.evaluatorTemplate.findMany({
      where: { isPreset: true },
    })

    for (const evaluator of presetEvaluators) {
      expect(evaluator.promptTemplate).toBeTruthy()
      expect(evaluator.promptTemplate.length).toBeGreaterThan(100) // 至少 100 字符
    }
  })

  it('预置评测器的 projectId 应该为 null', async () => {
    const presetEvaluators = await prisma.evaluatorTemplate.findMany({
      where: { isPreset: true },
    })

    for (const evaluator of presetEvaluators) {
      expect(evaluator.projectId).toBeNull()
    }
  })

  it('所有 8 个维度都应该有对应的评测器', async () => {
    const presetEvaluators = await prisma.evaluatorTemplate.findMany({
      where: { isPreset: true },
    })

    const evaluatorNames = presetEvaluators.map((e) => e.name.toLowerCase())

    for (const dimension of PRESET_EVALUATORS) {
      expect(evaluatorNames.some((name) => name.includes(dimension))).toBe(true)
    }
  })

  it('每个预置评测器应该有 numeric 类型和 0-10 分数范围', async () => {
    const presetEvaluators = await prisma.evaluatorTemplate.findMany({
      where: { isPreset: true },
    })

    for (const evaluator of presetEvaluators) {
      expect(evaluator.scoreType).toBe('numeric')
      expect(evaluator.minScore).toBe(0)
      expect(evaluator.maxScore).toBe(10)
    }
  })
})
