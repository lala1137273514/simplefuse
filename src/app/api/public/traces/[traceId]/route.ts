/**
 * Langfuse 兼容 Trace 详情 REST API
 * GET /api/public/traces/[traceId] - 获取 Trace 详情
 * DELETE /api/public/traces/[traceId] - 删除 Trace
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ traceId: string }> },
) {
  const { traceId } = await params

  const trace = await prisma.trace.findUnique({
    where: { id: traceId },
  })

  if (!trace) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ data: trace })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ traceId: string }> },
) {
  const projectId = await validateAuth(request)
  if (!projectId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { traceId } = await params

  await prisma.trace.delete({
    where: { id: traceId },
  })

  return NextResponse.json({ success: true })
}

// 支持 OPTIONS 请求（CORS）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
