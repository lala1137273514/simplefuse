
import { NextResponse } from 'next/server'

// Langfuse SDK 在初始化时会请求此端点验证凭据
// GET /api/public/projects
export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const base64Credentials = authHeader.split(' ')[1]
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii')
    const [publicKey] = credentials.split(':')

    // 验证 pk- 开头
    if (!publicKey || !publicKey.startsWith('pk-')) {
      return NextResponse.json({ error: 'Invalid public key' }, { status: 401 })
    }

    // 返回模拟的项目信息（Langfuse 格式）
    return NextResponse.json({
      data: [
        {
          id: 'default',
          name: 'SimpleFuse Default Project',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ]
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
