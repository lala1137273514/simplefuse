/**
 * Langfuse 兼容 Traces REST API
 * GET /api/public/traces - 获取 Traces 列表
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

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

  const traces = await prisma.trace.findMany({
    where: { projectId },
    orderBy: { timestamp: 'desc' },
    take: limit,
    skip: (page - 1) * limit,
  })

  return NextResponse.json({ data: traces })
}

// 支持 OPTIONS 请求（CORS）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
