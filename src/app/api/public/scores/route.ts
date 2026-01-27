/**
 * Langfuse 兼容 Scores REST API
 * GET /api/public/scores - 获取 Scores 列表
 * POST /api/public/scores - 创建 Score
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { randomUUID } from 'crypto'

// ============================================
// 辅助函数
// ============================================

/**
 * 验证 Basic Auth 并获取 Project
 */
async function validateAuth(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Basic ')) return null

  try {
    const credentials = Buffer.from(
      authHeader.split(' ')[1],
      'base64',
    ).toString('ascii')
    credentials.split(':') // publicKey:secretKey format

    // 简化：返回默认项目
    const project = await prisma.project.findFirst()
    return project?.id || null
  } catch {
    return null
  }
}

// ============================================
// API 处理
// ============================================

export async function GET(request: NextRequest) {
  const projectId = await validateAuth(request)
  if (!projectId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '20')
  const page = parseInt(searchParams.get('page') || '1')
  const traceId = searchParams.get('traceId')

  const where: { projectId: string; traceId?: string } = { projectId }
  if (traceId) {
    where.traceId = traceId
  }

  const scores = await prisma.score.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: limit,
    skip: (page - 1) * limit,
    include: {
      trace: {
        select: { id: true, name: true }
      }
    }
  })

  return NextResponse.json({ data: scores })
}

export async function POST(request: NextRequest) {
  const projectId = await validateAuth(request)
  if (!projectId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { traceId, name, value, comment } = body

    if (!traceId || !name || value === undefined) {
      return NextResponse.json(
        { error: 'traceId, name and value are required' },
        { status: 400 }
      )
    }

    // 验证 trace 存在
    const trace = await prisma.trace.findUnique({
      where: { id: traceId }
    })

    if (!trace) {
      return NextResponse.json(
        { error: 'Trace not found' },
        { status: 404 }
      )
    }

    const score = await prisma.score.create({
      data: {
        id: randomUUID(),
        traceId,
        projectId,
        evaluatorId: 'api',
        evaluatorName: name,
        score: typeof value === 'number' ? value : parseFloat(value),
        reasoning: comment,
        timestamp: new Date(),
      }
    })

    return NextResponse.json({ data: score }, { status: 201 })
  } catch (error) {
    console.error('[Scores API] Error creating score:', error)
    return NextResponse.json(
      { error: 'Failed to create score' },
      { status: 500 }
    )
  }
}

// 支持 OPTIONS 请求（CORS）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
